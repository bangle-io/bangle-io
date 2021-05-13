import {
  BaseFileMetadata,
  BaseFileSystem,
  BaseFileSystemError,
} from './base-fs';
import { DEFAULT_DIR_IGNORE_LIST } from './config';
import {
  FILE_NOT_FOUND_ERROR,
  UPSTREAM_ERROR,
  NOT_A_DIRECTORY_ERROR,
  NATIVE_BROWSER_PERMISSION_ERROR,
  FILE_ALREADY_EXISTS_ERROR,
} from './error-codes';

import {
  readFileAsText as readFileAsTextHelper,
  createFile,
  writeFile,
  hasPermission,
  recurseDirHandle,
} from './native-browser-fs-helpers';

const dirToChildMap = new WeakMap();

const isNotFoundDOMException = (error) =>
  error.name === 'NotFoundError' && error instanceof DOMException;

function catchUpstreamError(promise, errorMessage) {
  return promise.catch((error) => {
    if (error instanceof NativeBrowserFileSystemError) {
      throw error;
    } else {
      if (isNotFoundDOMException(error)) {
        throw new NativeBrowserFileSystemError(
          `Not found`,
          FILE_NOT_FOUND_ERROR,
          `The requested resource was not found`,
          error,
        );
      }
      return Promise.reject(
        new NativeBrowserFileSystemError(
          errorMessage,
          UPSTREAM_ERROR,
          null,
          error,
        ),
      );
    }
  });
}

export class NativeBrowserFileSystem extends BaseFileSystem {
  constructor(opts) {
    super(opts);

    const {
      rootDirHandle,
      allowedFile = () => true,
      allowedDir = (entry) => !DEFAULT_DIR_IGNORE_LIST.includes(entry.name),
    } = opts;

    this._rootDirHandle = rootDirHandle;
    if (!this._rootDirHandle) {
      throw new Error('rootDirHandle must be provided');
    }
    this._allowedFile = allowedFile;
    this._allowedDir = allowedDir;
    this._resolveFileHandle = resolveFileHandle({ allowedDir, allowedFile });

    const readFileAsText = this.readFileAsText.bind(this);
    const writeFile = this.writeFile.bind(this);
    const unlink = this.unlink.bind(this);
    const rename = this.rename.bind(this);
    const opendirRecursive = this.opendirRecursive.bind(this);

    this.readFileAsText = (...args) =>
      catchUpstreamError(readFileAsText(...args), 'Unable to read file');
    this.writeFile = (...args) =>
      catchUpstreamError(writeFile(...args), 'Unable to write file');
    this.unlink = (...args) =>
      catchUpstreamError(unlink(...args), 'Unable to unlink file');
    this.rename = (...args) =>
      catchUpstreamError(rename(...args), 'Unable to rename file');
    this.opendirRecursive = (...args) =>
      catchUpstreamError(opendirRecursive(...args), 'Unable to open dir');
  }

  async stat(filePath) {
    await verifyPermission(this._rootDirHandle, filePath);
    const { fileHandle } = await this._resolveFileHandle(
      this._rootDirHandle,
      filePath,
    );

    const file = await fileHandle.getFile();

    return new BaseFileMetadata({ mtimeMs: file.lastModified });
  }

  async readFileAsText(filePath) {
    const file = await this.readFile(filePath);
    const textContent = await readFileAsTextHelper(file);
    return textContent;
  }

  async readFile(filePath) {
    await verifyPermission(this._rootDirHandle, filePath);
    const { fileHandle } = await this._resolveFileHandle(
      this._rootDirHandle,
      filePath,
    );

    return fileHandle.getFile();
  }

  async writeFile(filePath, data) {
    this._verifyFileType(data);
    await verifyPermission(this._rootDirHandle, filePath);

    let fileHandle;
    let shouldCreateFile = false;

    try {
      ({ fileHandle } = await this._resolveFileHandle(
        this._rootDirHandle,
        filePath,
      ));
    } catch (error) {
      if (
        error instanceof NativeBrowserFileSystemError &&
        error.code === FILE_NOT_FOUND_ERROR
      ) {
        shouldCreateFile = true;
      } else {
        throw error;
      }
    }

    if (shouldCreateFile) {
      await createFile(this._rootDirHandle, filePath);
      ({ fileHandle } = await this._resolveFileHandle(
        this._rootDirHandle,
        filePath,
      ));
    }

    await writeFile(fileHandle, data);
  }

  async unlink(filePath) {
    await verifyPermission(this._rootDirHandle, filePath);

    const { fileHandle, parentHandles } = await this._resolveFileHandle(
      this._rootDirHandle,
      filePath,
    );

    const parentHandle = parentHandles[parentHandles.length - 1];
    await parentHandle.removeEntry(fileHandle.name);
  }

  async rename(oldFilePath, newFilePath) {
    const file = await this.readFile(oldFilePath);
    let existingFile;

    try {
      existingFile = await this.readFile(newFilePath);
    } catch (error) {
      if (error.code !== FILE_NOT_FOUND_ERROR) {
        throw error;
      }
    }

    if (existingFile) {
      throw new NativeBrowserFileSystemError(
        'File already exists',
        FILE_ALREADY_EXISTS_ERROR,
        'Cannot rename as a file with the same name already exists',
      );
    }

    await this.writeFile(newFilePath, file);
    await this.unlink(oldFilePath);
  }

  // recrusively list all files paths
  // example ['a/b/c.md', 'a/e.md']
  async opendirRecursive(dirPath) {
    await verifyPermission(this._rootDirHandle);

    const data = await recurseDirHandle(this._rootDirHandle, {
      allowedFile: this._allowedFile,
      allowedDir: this._allowedDir,
    });

    if (!dirPath.endsWith('/')) {
      dirPath += '/';
    }

    let files = data.map((r) => r.map((f) => f.name).join('/'));

    files = files.filter((k) => k.startsWith(dirPath));
    return files;
  }
}

export class NativeBrowserFileSystemError extends BaseFileSystemError {}

async function verifyPermission(rootDirHandle, filePath = '') {
  let permission = await hasPermission(rootDirHandle);
  if (!permission) {
    throw new NativeBrowserFileSystemError(
      `Permission rejected to read ${rootDirHandle.name}`,
      NATIVE_BROWSER_PERMISSION_ERROR,
      `Please grant permission to access "${filePath}"`,
    );
  }
}

/**
 * Finds a file given a path also caches it for speedier access.
 * Will throw error if file is not found.
 */
function resolveFileHandle({
  allowedDir = async (dirHandle) => true,
  allowedFile = async (fileHandle) => true,
}) {
  const getChildHandle = async (childName, dirHandle) => {
    const recalcuteChildren = async () => {
      let children = await asyncIteratorToArray(dirHandle.values());
      children = children.filter((entry) => {
        if (entry.kind === 'directory') {
          return allowedDir(entry);
        }
        if (entry.kind === 'file') {
          return allowedFile(entry);
        }
        throw new Error('Unknown kind of entry: ' + entry.kind);
      });
      dirToChildMap.set(dirHandle, children);
    };

    const findChild = () => {
      const children = dirToChildMap.get(dirHandle);
      if (!children) {
        return undefined;
      }
      const match = children.find((entry) => entry.name === childName);
      return match;
    };

    let match = findChild();

    if (match) {
      return match;
    }

    await recalcuteChildren();

    return findChild();
  };

  const recurse = async (path, dirHandle, absolutePath, parents) => {
    if (dirHandle.kind !== 'directory') {
      throw new NativeBrowserFileSystemError(
        `Cannot get Path "${path.join('/')}" as "${
          dirHandle.name
        }" is not a directory`,
        NOT_A_DIRECTORY_ERROR,
      );
    }

    parents.push(dirHandle);

    const [parentName, ...rest] = path;

    if (path.length === 1) {
      return dirHandle
        .getFileHandle(parentName, {
          create: false,
        })
        .catch(handleNotFoundDOMException(absolutePath));
    }

    const handle = await getChildHandle(parentName, dirHandle);

    if (!handle) {
      throw new NativeBrowserFileSystemError(
        `Path "${absolutePath.join('/')}" not found`,
        FILE_NOT_FOUND_ERROR,
        `File not found`,
      );
    }

    return recurse(rest, handle, absolutePath, parents);
  };

  return async (rootDirHandle, path) => {
    if (typeof path === 'string') {
      path = path.split('/');
    }

    if (path[0] !== rootDirHandle.name) {
      throw new Error(
        `getFile Error: root parent ${path[0]} must be the rootDirHandle ${rootDirHandle.name}`,
      );
    }

    let parentHandles = [];

    const fileHandle = await recurse(
      path.slice(1),
      rootDirHandle,
      path,
      parentHandles,
    );

    return {
      fileHandle,
      parentHandles,
    };
  };
}

function handleNotFoundDOMException(arrayFilePath) {
  return (error) => {
    if (isNotFoundDOMException(error)) {
      throw new NativeBrowserFileSystemError(
        `Path "${arrayFilePath.join('/')}" not found`,
        FILE_NOT_FOUND_ERROR,
        'File not found',
        error,
      );
    }
    throw error;
  };
}

async function asyncIteratorToArray(iter) {
  const arr = [];
  for await (const i of iter) {
    arr.push(i);
  }
  return arr;
}

export async function pickADirectory(dirHandle) {
  if (dirHandle) {
    let permission = await requestNativeBrowserFSPermission(dirHandle);
    if (!permission) {
      throw new NativeBrowserFileSystemError(
        'The permission to edit directory was denied',
        NATIVE_BROWSER_PERMISSION_ERROR,
      );
    }
  } else {
    try {
      dirHandle = await window.showDirectoryPicker();
      let permission = await requestNativeBrowserFSPermission(dirHandle);
      if (!permission) {
        throw new NativeBrowserFileSystemError(
          'The permission to edit directory was denied',
          NATIVE_BROWSER_PERMISSION_ERROR,
        );
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  }

  return dirHandle;
}

export async function requestNativeBrowserFSPermission(dirHandle) {
  const opts = {};
  opts.writable = true;
  // For Chrome 86 and later...
  opts.mode = 'readwrite';
  const perms = await dirHandle.requestPermission(opts);

  return perms === 'granted';
}

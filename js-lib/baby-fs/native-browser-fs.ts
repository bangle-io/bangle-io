import { isAbortError } from '@bangle.io/is-abort-error';

import {
  BaseFileMetadata,
  BaseFileSystem,
  BaseFileSystemError,
} from './base-fs';
import { DEFAULT_DIR_IGNORE_LIST } from './config';
import {
  FILE_ALREADY_EXISTS_ERROR,
  FILE_NOT_FOUND_ERROR,
  NATIVE_BROWSER_PERMISSION_ERROR,
  NATIVE_BROWSER_USER_ABORTED_ERROR,
  UPSTREAM_ERROR,
} from './error-codes';
import {
  createFile,
  hasPermission,
  readFileAsText as readFileAsTextHelper,
  recurseDirHandle,
} from './native-browser-fs-helpers';
import { writeToFile } from './universal-write-to-file';

const dirToChildMap = new WeakMap<
  FileSystemDirectoryHandle,
  Array<FileSystemDirectoryHandle | FileSystemFileHandle>
>();

const isNotFoundDOMException = (error: Error) =>
  error.name === 'NotFoundError' && error instanceof DOMException;

function catchUpstreamError<T>(promise: Promise<T>, errorMessage: string) {
  return promise.catch((error) => {
    if (error instanceof NativeBrowserFileSystemError) {
      throw error;
    } else {
      if (isNotFoundDOMException(error)) {
        throw new NativeBrowserFileSystemError({
          message: `The requested file was not found`,
          code: FILE_NOT_FOUND_ERROR,
        });
      }

      return Promise.reject(
        new NativeBrowserFileSystemError({
          message: errorMessage,
          code: UPSTREAM_ERROR,
        }),
      );
    }
  });
}

export class NativeBrowserFileSystem extends BaseFileSystem {
  private _allowedDir: (entry: FileSystemDirectoryHandle) => boolean;
  private _allowedFile: (f: FileSystemFileHandle) => boolean;

  private _resolveFileHandle: ReturnType<typeof resolveFileHandle>;
  private _rootDirHandle: FileSystemDirectoryHandle;

  constructor(opts: {
    rootDirHandle: FileSystemDirectoryHandle;
    allowedFile?: (f: { name: string }) => boolean;
    allowedDir?: (entry: { name: string }) => boolean;
  }) {
    super({
      allowedFile: opts.allowedFile,
      allowedDir: opts.allowedDir,
    });

    const {
      rootDirHandle,
      allowedFile = () => true,
      // TODO move this out and standardize the ignore across all bangle
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

  async opendirRecursive(dirPath: string) {
    if (!dirPath) {
      throw new Error('dirPath must be defined');
    }

    await verifyPermission(this._rootDirHandle);

    const data = await recurseDirHandle(this._rootDirHandle, {
      allowedFile: this._allowedFile,
      allowedDir: this._allowedDir,
    });

    if (!dirPath.endsWith('/')) {
      dirPath += '/';
    }

    let files = data.map((r) => r.map((f) => f.name).join('/'));

    files = dirPath ? files.filter((k) => k.startsWith(dirPath)) : files;

    return files;
  }

  async readFile(filePath: string): Promise<File> {
    this._verifyFilePath(filePath);

    await verifyPermission(this._rootDirHandle, filePath);
    const { fileHandle } = await this._resolveFileHandle(
      this._rootDirHandle,
      filePath,
    );

    return fileHandle.getFile();
  }

  async readFileAsText(filePath: string): Promise<string> {
    this._verifyFilePath(filePath);

    const file = await this.readFile(filePath);
    const textContent = await readFileAsTextHelper(file);

    return textContent;
  }

  async rename(oldFilePath: string, newFilePath: string) {
    this._verifyFilePath(oldFilePath);
    this._verifyFilePath(newFilePath);

    const file = await this.readFile(oldFilePath);
    let existingFile;

    try {
      existingFile = await this.readFile(newFilePath);
    } catch (error) {
      if (!(error instanceof BaseFileSystemError)) {
        throw error;
      }
      if (error.code !== FILE_NOT_FOUND_ERROR) {
        throw error;
      }
    }

    if (existingFile) {
      throw new NativeBrowserFileSystemError({
        message: 'Cannot rename as a file with the same name already exists',
        code: FILE_ALREADY_EXISTS_ERROR,
      });
    }

    await this.writeFile(newFilePath, file);
    await this.unlink(oldFilePath);
  }

  async stat(filePath: string) {
    await verifyPermission(this._rootDirHandle, filePath);
    const { fileHandle } = await this._resolveFileHandle(
      this._rootDirHandle,
      filePath,
    );

    const file = await fileHandle.getFile();

    return new BaseFileMetadata({ mtimeMs: file.lastModified });
  }

  async unlink(filePath: string) {
    this._verifyFilePath(filePath);

    await verifyPermission(this._rootDirHandle, filePath);

    const { fileHandle, parentHandles } = await this._resolveFileHandle(
      this._rootDirHandle,
      filePath,
    );

    const parentHandle = parentHandles[parentHandles.length - 1];
    await parentHandle?.removeEntry(fileHandle.name);
  }

  async writeFile(filePath: string, data: File) {
    this._verifyFilePath(filePath);
    this._verifyFileType(data);
    await verifyPermission(this._rootDirHandle, filePath);

    let fileHandle: FileSystemFileHandle | undefined;
    let shouldCreateFile = false;
    let parentHandles: FileSystemDirectoryHandle[] = [];
    try {
      ({ fileHandle, parentHandles } = await this._resolveFileHandle(
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
      ({ fileHandle, parentHandles } = await this._resolveFileHandle(
        this._rootDirHandle,
        filePath,
      ));
    }

    if (!fileHandle) {
      throw new Error('fileHandle must be defined');
    }

    await writeToFile(fileHandle, data, parentHandles);
  }
}

export class NativeBrowserFileSystemError extends BaseFileSystemError {}

async function verifyPermission(
  rootDirHandle: FileSystemDirectoryHandle,
  filePath = '',
) {
  let permission = await hasPermission(rootDirHandle);

  if (!permission) {
    throw new NativeBrowserFileSystemError({
      message: `Permission rejected to read ${rootDirHandle.name}`,
      code: NATIVE_BROWSER_PERMISSION_ERROR,
    });
  }
}

/**
 * Finds a file given a path also caches it for speedier access.
 * Will throw error if file is not found.
 */
function resolveFileHandle({
  allowedDir = (dirHandle: FileSystemDirectoryHandle): boolean => true,
  allowedFile = (fileHandle: FileSystemFileHandle): boolean => true,
}) {
  const getChildHandle = async (
    childName: string,
    dirHandle: FileSystemDirectoryHandle,
  ) => {
    const recalcuteChildren = async () => {
      let children = await asyncIteratorToArray(dirHandle.values());
      children = children.filter((entry) => {
        if (entry.kind === 'directory') {
          return allowedDir(entry);
        }
        if (entry.kind === 'file') {
          return allowedFile(entry);
        }
        throw new Error('Unknown kind of entry: ' + (entry as any).kind);
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

  const recurse = async (
    path: string[],
    dirHandle: FileSystemDirectoryHandle | FileSystemFileHandle,
    absolutePath: string[],
    parents: FileSystemDirectoryHandle[],
  ): Promise<FileSystemFileHandle> => {
    if (dirHandle.kind !== 'directory') {
      throw new Error(
        `Cannot get Path "${path.join('/')}" as "${
          dirHandle.name
        }" is not a directory`,
      );
    }

    parents.push(dirHandle);

    const [parentName, ...rest] = path;

    if (!parentName) {
      throw new Error('Parent name must be defined');
    }
    if (path.length === 1) {
      return dirHandle
        .getFileHandle(parentName, {
          create: false,
        })
        .catch(handleNotFoundDOMException(absolutePath));
    }

    const handle = await getChildHandle(parentName, dirHandle);

    if (!handle) {
      throw new NativeBrowserFileSystemError({
        message: `File at "${absolutePath.join('/')}" not found`,
        code: FILE_NOT_FOUND_ERROR,
      });
    }

    return recurse(rest, handle, absolutePath, parents);
  };

  return async (
    rootDirHandle: FileSystemDirectoryHandle,
    path: string | string[],
  ): Promise<{
    fileHandle: FileSystemFileHandle;
    parentHandles: FileSystemDirectoryHandle[];
  }> => {
    if (typeof path === 'string') {
      path = path.split('/');
    }

    if (path[0] !== rootDirHandle.name) {
      throw new Error(
        `getFile Error: root parent ${path[0]} must be the rootDirHandle ${rootDirHandle.name}`,
      );
    }

    let parentHandles: FileSystemDirectoryHandle[] = [];

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

function handleNotFoundDOMException(arrayFilePath: string[]) {
  return (error: Error) => {
    if (isNotFoundDOMException(error)) {
      throw new NativeBrowserFileSystemError({
        message: `File at "${arrayFilePath.join('/')}" not found`,
        code: FILE_NOT_FOUND_ERROR,
      });
    }
    throw error;
  };
}

async function asyncIteratorToArray<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const arr: T[] = [];
  for await (const i of iter) {
    arr.push(i);
  }

  return arr;
}

export async function pickADirectory() {
  try {
    let dirHandle: FileSystemDirectoryHandle = await (
      window as any
    ).showDirectoryPicker();
    let permission = await requestNativeBrowserFSPermission(dirHandle);

    if (!permission) {
      throw new NativeBrowserFileSystemError({
        message: 'The permission to edit directory was denied',
        code: NATIVE_BROWSER_PERMISSION_ERROR,
      });
    }

    return dirHandle;
  } catch (err) {
    if (err instanceof Error) {
      if (isAbortError(err)) {
        throw new NativeBrowserFileSystemError({
          message: 'The user aborted.',
          code: NATIVE_BROWSER_USER_ABORTED_ERROR,
        });
      }

      throw new Error(err.message);
    }
    throw err;
  }
}

export async function requestNativeBrowserFSPermission(
  dirHandle: FileSystemDirectoryHandle,
) {
  const opts: any = {};
  opts.writable = true;
  // For Chrome 86 and later...
  opts.mode = 'readwrite';
  const perms = await dirHandle.requestPermission(opts);

  return perms === 'granted';
}

export function supportsNativeBrowserFs() {
  if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
    return true;
  } else {
    return false;
  }
}

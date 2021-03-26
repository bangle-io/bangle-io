import { FSError } from './errors';

const DEFAULT_DIR_IGNORE_LIST = ['node_modules', '.git'];
const LOG = true;
let log = LOG ? console.log.bind(console, 'nativefs-helpers') : () => {};

export const NATIVE_FS_READ_ERROR = 'NATIVE_FS_READ_ERROR';
export const NATIVE_FS_WRITE_ERROR = 'NATIVE_FS_WRITE_ERROR';
export const NATIVE_FS_FILE_NOT_FOUND_ERROR = 'NATIVE_FS_FILE_NOT_FOUND_ERROR';
export const NATIVE_FS_PERMISSION_ERROR = 'NATIVE_FS_PERMISSION_ERROR';
export const CONFIG_DIRECTORY = '.bangle';
export const BACKUP_DIRECTORY = [CONFIG_DIRECTORY, 'backups'];
/**
 *
 * @param {string[]} filePath [...parentDirNames, fileName]
 * @param {DirHandle} rootDirHandle
 */
export class NativeFileOps {
  constructor({
    allowedFile,
    allowedDir = (entry) => !DEFAULT_DIR_IGNORE_LIST.includes(entry.name),
    // hiddenDirNames is different from allowedDir in the sense that
    // it allows your to read and write to these dirs but it doesnt show
    // up in the listFiles, a good example is the config .bangle directory
    hiddenDirNames = [CONFIG_DIRECTORY],
  } = {}) {
    this._allowedFile = allowedFile;
    this._allowedDir = allowedDir;
    this._hiddenDirNames = hiddenDirNames;
    this._getFileHandle = getFileHandle({ allowedDir, allowedFile });
  }

  async _verifyPermission(rootDirHandle) {
    let permission = await hasPermission(rootDirHandle);

    if (!permission) {
      throw new FSError(
        `Permission required to read ${rootDirHandle.name}`,
        NATIVE_FS_PERMISSION_ERROR,
      );
    }
  }

  /**
   *
   * @param {string[]} path [...parentDirNames, fileName] must include rootDirHandleName at index 0
   * @param {*} rootDirHandle
   */
  async readFile(path, rootDirHandle) {
    await this._verifyPermission(rootDirHandle);

    const { fileHandle } = await this._getFileHandle(path, rootDirHandle);
    try {
      const file = await fileHandle.getFile();
      const textContent = await readFile(file);
      return { file, textContent };
    } catch (error) {
      throw new FSError(
        `file ${path.join('/')} read error`,
        NATIVE_FS_READ_ERROR,
        null,
        error,
      );
    }
  }

  /**
   *
   * @param {string[]} path [...parentDirNames, fileName] dont include rootDirHandleName in parentDirNames
   * @param {*} rootDirHandle
   * @param {string} textContent
   */
  async saveFile(path, rootDirHandle, textContent) {
    await this._verifyPermission(rootDirHandle);

    let fileHandle;
    let shouldCreateFile = false;
    try {
      ({ fileHandle } = await this._getFileHandle(path, rootDirHandle));
    } catch (error) {
      if (
        error instanceof FSError &&
        error.code === NATIVE_FS_FILE_NOT_FOUND_ERROR
      ) {
        shouldCreateFile = true;
      } else {
        throw error;
      }
    }

    if (shouldCreateFile) {
      try {
        await createFile(path, rootDirHandle, textContent);
        ({ fileHandle } = await this._getFileHandle(path, rootDirHandle));
      } catch (error) {
        throw new FSError(
          'Unable to create file',
          NATIVE_FS_WRITE_ERROR,
          null,
          error,
        );
      }
    }

    await writeFile(fileHandle, textContent);
  }

  async renameFile(oldPath, newPath, rootDirHandle) {
    if (
      oldPath.slice(0, oldPath.length - 1).join('/') !==
      newPath.slice(0, newPath.length - 1).join('/')
    ) {
      throw new Error('Cannot rename parent directories');
    }

    const oldFile = await this.readFile(oldPath, rootDirHandle);
    await this.deleteFile(oldPath, rootDirHandle, true);
    await this.saveFile(newPath, rootDirHandle, oldFile.textContent);
  }

  async deleteFile(path, rootDirHandle, backup) {
    const { fileHandle, parentHandles } = await this._getFileHandle(
      path,
      rootDirHandle,
    );
    if (backup) {
      const backupContent = (await this.readFile(path, rootDirHandle))
        .textContent;

      await this.saveFile(
        [
          rootDirHandle.name,
          ...BACKUP_DIRECTORY,
          new Date().getTime() + '--' + fileHandle.name,
        ],
        rootDirHandle,
        backupContent,
      );
    }

    const parentHandle = getLast(parentHandles);
    await parentHandle.removeEntry(fileHandle.name);
  }

  async listFiles(rootDirHandle) {
    await this._verifyPermission(rootDirHandle);
    let permission = await hasPermission(rootDirHandle);

    if (!permission) {
      throw new FSError(
        `Permission required to list`,
        NATIVE_FS_PERMISSION_ERROR,
      );
    }

    const data = await recurseDirHandle(rootDirHandle, {
      allowedFile: this._allowedFile,
      allowedDir: this._allowedDir,
    });

    return data.filter((item) => {
      return !item.some(
        (handle) =>
          handle.kind === 'directory' &&
          this._hiddenDirNames.includes(handle.name),
      );
    });
  }
}
/**
 *
 * Note this will always return a list of files and not empty directories
 * @param {Object} dirHandle The directory handle
 * @returns {Array<[dirHandles, fileHandle]>} returns a 2 dimensional array, with each element having [...parentDirHandless, fileHandle].
 *          The parent dir are in order of decreasing order of their distance from file, first parent being the ancestor of all others, and the last parent
 *           being the direct parent of file.
 */
async function recurseDirHandle(
  rootDir,
  {
    allowedFile = async (fileHandle) => true,
    allowedDir = async (dirHandle) => true,
  } = {},
) {
  const _recurse = async (dirHandle) => {
    let result = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && allowedFile(entry)) {
        result.push([dirHandle, entry]);
      }
      if (entry.kind === 'directory' && allowedDir(entry)) {
        let children = await recurseDirHandle(entry, {
          allowedDir,
          allowedFile,
        });
        // attach the parent first
        children = children.map((r) => [dirHandle, ...r]);
        result = result.concat(children);
      }
    }
    return result.filter((r) => r.length > 0);
  };
  const result = await _recurse(rootDir);
  return result;
}

/**
 * Finds a file given a path also caches it for speedier access.
 * Will throw error if file is not found.
 */
function getFileHandle({
  allowedDir = async (dirHandle) => true,
  allowedFile = async (fileHandle) => true,
}) {
  let dirToChildMap = new WeakMap();
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
    log('Cache miss');

    await recalcuteChildren();

    return findChild();
  };

  const recurse = async (path, dirHandle, absolutePath, parents) => {
    if (dirHandle.kind !== 'directory') {
      throw new FSError(
        `Cannot get Path "${path.join('/')}" as "${
          dirHandle.name
        }" is not a directory`,
        NATIVE_FS_READ_ERROR,
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
      throw new FSError(
        `Path "${absolutePath.join('/')}" not found`,
        NATIVE_FS_FILE_NOT_FOUND_ERROR,
      );
    }

    return recurse(rest, handle, absolutePath, parents);
  };

  return async (path, rootDirHandle) => {
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

function getLast(array) {
  return array[array.length - 1];
}

function readFile(file) {
  // If the new .text() reader is available, use it.
  if (file.text) {
    return file.text();
  }
  // Otherwise use the traditional file reading technique.
  return _readFileLegacy(file);
}

/**
 *
 * @param {string[]} path [parent, ...rest] array of names relative to dirHandle
 * @param {*} dirHandle
 */
async function createFile(path, rootDirHandle) {
  const recurse = async (path, dirHandle) => {
    const [parentName, ...rest] = path;

    if (path.length === 1) {
      return dirHandle.getFileHandle(parentName, { create: true });
    }

    const newHandle = await dirHandle.getDirectoryHandle(parentName, {
      create: true,
    });

    return recurse(rest, newHandle);
  };

  if (path[0] !== rootDirHandle.name) {
    throw new Error(
      `getFile Error: root parent ${path[0]} must be the rootDirHandle ${rootDirHandle.name}`,
    );
  }
  return recurse(path.slice(1), rootDirHandle);
}

async function writeFile(fileHandle, contents) {
  // Support for Chrome 82 and earlier.
  if (fileHandle.createWriter) {
    // Create a writer (request permission if necessary).
    const writer = await fileHandle.createWriter();
    // Write the full length of the contents
    await writer.write(0, contents);
    // Close the file and write the contents to disk
    await writer.close();
    return;
  }
  // For Chrome 83 and later.
  // Create a FileSystemWritableFileStream to write to.
  const writable = await fileHandle.createWritable();

  // TODO this throws a promise rejection internally, not sure
  // if this the root cause of the crswap issue
  // Write the contents of the file to the stream.
  await writable.write(contents);

  // Close the file and write the contents to disk.
  await writable.close();
}

/**
 * Reads the raw text from a file.
 *
 * @private
 * @param {File} file
 * @return {Promise<string>} A promise that resolves to the parsed string.
 */
function _readFileLegacy(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (e) => {
      const text = e.srcElement.result;
      resolve(text);
    });
    reader.readAsText(file);
  });
}

export async function pickADirectory(dirHandle) {
  if (dirHandle) {
    let permission = await requestPermission(dirHandle);
    if (!permission) {
      throw new FSError(
        'The permission to edit directory was denied',
        NATIVE_FS_PERMISSION_ERROR,
      );
    }
  } else {
    try {
      dirHandle = await window.showDirectoryPicker();
      let permission = await requestPermission(dirHandle);
      if (!permission) {
        throw new FSError(
          'The permission to edit directory was denied',
          NATIVE_FS_PERMISSION_ERROR,
        );
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  }

  return dirHandle;
}

export async function hasPermission(dirHandle) {
  const opts = {};
  opts.writable = true;
  // For Chrome 86 and later...
  opts.mode = 'readwrite';
  return (await dirHandle.queryPermission(opts)) === 'granted';
}

export async function requestPermission(dirHandle) {
  const opts = {};
  opts.writable = true;
  // For Chrome 86 and later...
  opts.mode = 'readwrite';
  const perms = await dirHandle.requestPermission(opts);

  return perms === 'granted';
}

async function asyncIteratorToArray(iter) {
  const arr = [];
  for await (const i of iter) {
    arr.push(i);
  }
  return arr;
}

function handleNotFoundDOMException(filePath) {
  return (error) => {
    if (error.name === 'NotFoundError' && error instanceof DOMException) {
      throw new FSError(
        `Path "${filePath.join('/')}" not found`,
        NATIVE_FS_FILE_NOT_FOUND_ERROR,
        null,
        error,
      );
    }
    throw error;
  };
}

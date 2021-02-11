const DEFAULT_DIR_IGNORE_LIST = ['node_modules', '.git'];
const LOG = true;
let log = LOG ? console.log.bind(console, 'nativefs-helpers') : () => {};

/**
 *
 * @param {string[]} filePath [...parentDirNames, fileName]
 * @param {DirHandle} rootDirHandle
 */
export class NativeFileOps {
  constructor({
    allowedFile,
    allowedDir = (entry) => !DEFAULT_DIR_IGNORE_LIST.includes(entry.name),
  } = {}) {
    this._allowedFile = allowedFile;
    this._allowedDir = allowedDir;
    this._getFileHandle = getFileHandle({ allowedDir, allowedFile });
  }

  /**
   *
   * @param {string[]} path [...parentDirNames, fileName] must include rootDirHandleName at index 0
   * @param {*} rootDirHandle
   */
  async readFile(path, rootDirHandle) {
    let permission = await hasPermission(rootDirHandle);
    if (!permission) {
      throw new NativeFilePermissionError(
        `Permission required to read ${path}`,
      );
    }
    const { fileHandle } = await this._getFileHandle(path, rootDirHandle);
    try {
      const file = await fileHandle.getFile();
      const textContent = await readFile(file);
      return { file, textContent };
    } catch (error) {
      throw new NativeFSReadError(`file ${path.join('/')} read error`, error);
    }
  }

  /**
   *
   * @param {string[]} path [...parentDirNames, fileName] dont include rootDirHandleName in parentDirNames
   * @param {*} rootDirHandle
   * @param {string} textContent
   */
  async saveFile(path, rootDirHandle, textContent) {
    let permission = await hasPermission(rootDirHandle);
    if (!permission) {
      throw new NativeFilePermissionError(
        `Permission required to save ${path}`,
      );
    }

    let fileHandle;
    let shouldCreateFile = false;
    try {
      ({ fileHandle } = await this._getFileHandle(path, rootDirHandle));
    } catch (error) {
      if (error instanceof NativeFSFileNotFoundError) {
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
        throw new NativeFSWriteError('Unable to create file', error);
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
    await this.saveFile(newPath, rootDirHandle, oldFile.textContent);
    await this.deleteFile(oldPath, rootDirHandle);
  }

  async deleteFile(path, rootDirHandle) {
    const { fileHandle, parentHandles } = await this._getFileHandle(
      path,
      rootDirHandle,
    );
    const parentHandle = getLast(parentHandles);
    await parentHandle.removeEntry(fileHandle.name);
  }

  async listFiles(rootDirHandle) {
    const data = await recurseDirHandle(rootDirHandle, {
      allowedFile: this._allowedFile,
      allowedDir: this._allowedDir,
    });

    return data;
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
  dirHandle,
  {
    allowedFile = async (fileHandle) => true,
    allowedDir = async (dirHandle) => true,
  } = {},
) {
  let result = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && allowedFile(entry)) {
      result.push([dirHandle, entry]);
    }
    if (entry.kind === 'directory' && allowedDir(entry)) {
      let children = await recurseDirHandle(entry, { allowedDir, allowedFile });
      // attach the parent first
      children = children.map((r) => [dirHandle, ...r]);
      result = result.concat(children);
    }
  }
  return result.filter((r) => r.length > 0);
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
      throw new NativeFSReadError(
        `Cannot get Path "${path.join('/')}" as "${
          dirHandle.name
        }" is not a directory`,
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
      throw new NativeFSFileNotFoundError(
        `Path "${absolutePath.join('/')}" not found`,
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
    console.log('got permissions');
    if (!permission) {
      throw new NativeFilePermissionError(
        'The permission to edit directory was denied',
      );
    }
  } else {
    try {
      dirHandle = await window.showDirectoryPicker();
      let permission = await requestPermission(dirHandle);
      if (!permission) {
        throw new NativeFilePermissionError(
          'The permission to edit directory was denied',
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
      throw new NativeFSFileNotFoundError(
        `Path "${filePath.join('/"')}" not found`,
        error,
      );
    }
    throw error;
  };
}

export class NativeFSReadError extends Error {
  constructor(message, src) {
    super(message);
    if (src) {
      console.log('original error');
      console.error(src);
    }
    this.name = 'NativeFSReadError';
    this.src = src;
  }
}

export class NativeFSWriteError extends Error {
  constructor(message, src) {
    super(message);
    if (src) {
      console.log('original error');
      console.error(src);
    }
    this.name = 'NativeFSWriteError';
    this.src = src;
  }
}

export class NativeFSFileNotFoundError extends NativeFSReadError {
  constructor(msg, src) {
    super(msg, src);
    this.name = 'NativeFSFileNotFoundError';
  }
}

export class NativeFilePermissionError extends NativeFSReadError {
  constructor(message) {
    super(message);
    this.name = 'NativeFilePermissionError';
  }
}

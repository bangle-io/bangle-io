import * as idb from 'idb-keyval';
const DEFAULT_DIR_IGNORE_LIST = ['node_modules', '.git'];

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
    this._traverseCache = new WeakMap();
  }

  _calculateFilesCache = async (rootDirHandle) => {
    const listOfFiles = await recurseDirHandle(rootDirHandle, {
      allowedFile: this._allowedFile,
      allowedDir: this._allowedDir,
    });

    const availableFiles = new Map(
      listOfFiles.map((f) => {
        return [f.map((r) => r.name).join('/'), f];
      }),
    );

    this._traverseCache.set(rootDirHandle, availableFiles);
    return availableFiles;
  };

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

    let availableFiles = this._traverseCache.get(rootDirHandle);
    const joinedPath = path.join('/');

    if (!availableFiles) {
      availableFiles = await this._calculateFilesCache(rootDirHandle);
    }

    let match = availableFiles.get(joinedPath);

    // Find again, because the cache might have gotten stale
    if (!match) {
      availableFiles = await this._calculateFilesCache(rootDirHandle);
      match = availableFiles.get(joinedPath);

      if (!match) {
        throw new NativeFSFileNotFoundError(
          `Cannot read as file ${joinedPath} not found`,
        );
      }
    }

    let file;

    try {
      file = await getLast(match).getFile();
    } catch (error) {
      if (error.name === 'NotFoundError' && error instanceof DOMException) {
        // Find again, because in case file changed but name stayed same
        availableFiles = await this._calculateFilesCache(rootDirHandle);
        match = availableFiles.get(joinedPath);

        if (!match) {
          throw new NativeFSFileNotFoundError(`file ${joinedPath} not found`);
        }

        try {
          file = await getLast(match).getFile();
        } catch (error2) {
          if (
            error2.name === 'NotFoundError' &&
            error2 instanceof DOMException
          ) {
            throw new NativeFSFileNotFoundError(
              `file ${joinedPath} not found`,
              error2,
            );
          }
          throw new NativeFSReadError(`file ${joinedPath} read error`, error2);
        }
      } else {
        throw new NativeFSReadError(`file ${joinedPath} read error`, error);
      }
    }

    try {
      const textContent = await readFile(file);
      return { file, textContent };
    } catch (error) {
      throw new NativeFSReadError(`file ${joinedPath} read error`, error);
    }
  }

  /**
   *
   * @param {string[]} path [...parentDirNames, fileName] dont include rootDirHandleName in parentDirNames
   * @param {*} rootDirHandle
   * @param {string} content
   */
  async saveFile(path, rootDirHandle, content) {
    let permission = await hasPermission(rootDirHandle);
    if (!permission) {
      throw new NativeFilePermissionError(
        `Permission required to save ${path}`,
      );
    }

    let availableFiles = this._traverseCache.get(rootDirHandle);
    const joinedPath = path.join('/');
    if (!availableFiles) {
      availableFiles = await this._calculateFilesCache(rootDirHandle);
    }

    let match = availableFiles.get(joinedPath);

    if (!match) {
      try {
        await createFile(path.slice(1), rootDirHandle, content);
      } catch (error) {
        throw new NativeFSWriteError('Unable to create file', error);
      }

      availableFiles = await this._calculateFilesCache(rootDirHandle);
      match = availableFiles.get(joinedPath);
    }

    const fileHandler = getLast(match);
    await writeFile(fileHandler, content);
  }

  async listFiles(rootDirHandle) {
    const availableFiles = await this._calculateFilesCache(rootDirHandle);

    return [...availableFiles.values()];
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
 * @param {string[]} path [parent, ...rest] array of names relative to dirHandle i.e. parent must be direct child of dirHandle
 * @param {*} dirHandle
 */
async function createFile(path, dirHandle) {
  const [parentName, ...rest] = path;

  if (path.length === 1) {
    return dirHandle.getFileHandle(parentName, { create: true });
  }

  const newHandle = await dirHandle.getDirectoryHandle(parentName, {
    create: true,
  });

  return createFile(rest, newHandle);
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

/**
 * TESTS
 */

window.FileOpts = NativeFileOps;
window.pickADirectory = pickADirectory;
window.recurseDirHandle = recurseDirHandle;
window.createFile = createFile;

// a poorman semimanual test
window.nativeFSTest1 = async function () {
  console.info('pick bangle.dev directory');
  const dirHandle = await pickADirectory();
  console.log({ dirHandle });

  const fileOps = new NativeFileOps();
  console.log({ fileOps });

  console.info(
    'reading README.md, expect READMEs content and a faster second read',
  );
  console.time('firstRead');
  let { textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'README.md'],
    dirHandle,
  );
  console.timeEnd('firstRead');
  console.time('secondRead');

  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'README.md'],
    dirHandle,
  ));

  console.timeEnd('secondRead');

  console.log({ fileContent });
  console.info('attempted to read non existent file, expect not found error');
  await fileOps
    .readFile([dirHandle.name, 'README'], dirHandle)
    .then(() => console.warn('should have failed'))
    .catch((error) => {
      console.error(error);
    });

  console.info("reading deeply nested file , expect md's content");
  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'markdown', '__tests__', 'fixtures', 'todo1.md'],
    dirHandle,
  ));

  console.log({ fileContent });

  console.info('reading a folder , should fail');
  await fileOps
    .readFile([dirHandle.name, 'markdown', '__tests__', 'fixtures'], dirHandle)
    .then(() => console.warn('should have failed'))
    .catch((error) => {
      console.error(error);
    });
  console.log('done');
};

//  testing file renaming and deletion
window.nativeFSTest2 = async function* () {
  console.info('pick bangle.dev directory');
  const dirHandle = await pickADirectory();
  console.log({ dirHandle });

  const fileOps = new NativeFileOps();
  console.log({ fileOps });

  console.info('create dummy.md, expect dummys content');

  yield null;

  let { textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'dummy.md'],
    dirHandle,
  );
  console.log({ fileContent });
  console.info('now rename dummy.md to dummy2.md and  expect not found error');
  yield null;

  await fileOps
    .readFile([dirHandle.name, 'dummy.md'], dirHandle)
    .then(() => console.warn('should have failed'))
    .catch((error) => {
      console.error(error);
    });

  console.info('now reading dummy2.md expect contents');

  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'dummy2.md'],
    dirHandle,
  ));
  console.log({ fileContent });

  console.info('now delete dummy2.md and copy the content');

  yield null;

  console.info('now will attempt to read deleted dummy2.md should throw error');
  await fileOps
    .readFile([dirHandle.name, 'dummy2.md'], dirHandle)
    .then(() => console.warn('should have failed'))
    .catch((error) => {
      console.error(error);
    });

  console.info('now bring back dummy2.md and will  attempt to read it');
  yield null;
  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'dummy2.md'],
    dirHandle,
  ));
  console.log({ fileContent });

  console.log('done!');
};

const customStore = idb.createStore(
  'test-permission-db-1',
  'test-permission-store-1',
);

window.nativeFSPermissionTestSave = async function () {
  const dirHandle = await pickADirectory();
  console.info('will be saving the handle and then reload and call read test');
  await idb.set('bangledev', dirHandle, customStore);
};

window.nativeFSPermissionTestRequestPermission = async function () {
  const dirHandle = await idb.get('bangledev', customStore);
  await requestPermission(dirHandle);
  return dirHandle;
};

window.nativeFSPermissionTestRead = async function () {
  const dirHandle = await idb.get('bangledev', customStore);
  console.log({ dirHandle });
  const fileOps = new NativeFileOps();
  let { textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'README.md'],
    dirHandle,
  );
  console.log({ fileContent });
};
const fileOps = new NativeFileOps();

window.nativeFSPermissionTestWrite = async function (content = 'hi') {
  const dirHandle = await idb.get('bangledev', customStore);
  let fileContent = await fileOps.saveFile(
    [dirHandle.name, 'dummy.md'],
    dirHandle,
    content,
  );
  console.log({ fileContent });
};

window.nativeFSPermissionWrite2 = async function* (content = 'hi') {
  console.info('pick a temp directory as it will become noisy');

  console.info('creating file ./dummy.md');
  const dirHandle = await pickADirectory();
  await fileOps.saveFile([dirHandle.name, 'dummy.md'], dirHandle, content);
  let { textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'dummy.md'],
    dirHandle,
  );

  console.assert(fileContent === content, 'content 0 must match');

  console.info('creating file ,/a/b/c/dummy.md');
  await fileOps.saveFile(
    [dirHandle.name, 'a', 'b', 'c', 'dummy.md'],
    dirHandle,
    content,
  );
  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'a', 'b', 'c', 'dummy.md'],
    dirHandle,
  ));

  console.assert(fileContent === content, 'content1 must match');
  yield null;

  console.info(
    'create file  ./a/b/dummy.md nested in dirs but with no dir creation',
  );
  await fileOps.saveFile(
    [dirHandle.name, 'a', 'b', 'dummy.md'],
    dirHandle,
    content,
  );

  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'a', 'b', 'dummy.md'],
    dirHandle,
  ));

  console.assert(fileContent === content, 'content 2 must match');
};

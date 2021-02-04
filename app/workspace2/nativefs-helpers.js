/**
 *
 * @param {string[]} filePath [...parentDirNames, fileName]
 * @param {DirHandle} rootDirHandle
 */
class FileOpts {
  constructor({ allowedFile, allowedDir } = {}) {
    this._allowedFile = allowedFile;
    this._allowedDir = allowedDir;
    this._traverseCache = new WeakMap();
  }

  /**
   *
   * @param {string[]} path [...parentDirNames, fileName] dont include rootDirHandleName in parentDirNames
   * @param {*} rootDirHandle
   */
  async readFile(path, rootDirHandle) {
    let availableFiles = this._traverseCache.get(rootDirHandle);

    const redoCache = async () => {
      availableFiles = await recurseDirHandle(rootDirHandle, {
        allowedFile: this._allowedFile,
        allowedDir: this._allowedDir,
      });
      this._traverseCache.set(rootDirHandle, availableFiles);
    };

    const findFile = () => {
      return availableFiles.find((f) => {
        return (
          f
            .slice(1)
            .map((r) => r.name)
            .join('/') === path.join('/')
        );
      });
    };

    if (!availableFiles) {
      await redoCache();
    }

    let match = findFile();

    // Find again, because the cache might have gotten stale
    if (!match) {
      await redoCache();
      match = findFile();

      if (!match) {
        throw new Error('File not found');
      }
    }

    const file = await getLast(match).getFile();
    const textContent = await readFile(file);

    return textContent;
  }
}
/**
 *
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

window.FileOpts = FileOpts;
window.pickADirectory = pickADirectory;

async function pickADirectory(dirHandle) {
  if (dirHandle) {
    let permission = await verifyPermission(dirHandle);
    console.log('got permissions');
    if (!permission) {
      throw new FilePermissionError(
        'The permission to edit directory was denied',
      );
    }
  } else {
    try {
      dirHandle = await window.showDirectoryPicker();
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  }

  return dirHandle;
}

async function verifyPermission(fileHandle, withWrite = true) {
  const opts = {};
  if (withWrite) {
    opts.writable = true;
    // For Chrome 86 and later...
    opts.mode = 'readwrite';
  }
  // Check if we already have permission, if so, return true.
  if ((await fileHandle.queryPermission(opts)) === 'granted') {
    return true;
  }
  // Request permission to the file, if the user grants permission, return true.
  if ((await fileHandle.requestPermission(opts)) === 'granted') {
    return true;
  }
  // The user did nt grant permission, return false.
  return false;
}

export class FilePermissionError extends Error {
  constructor(message) {
    super('FilePermissionError: ' + message);
    this.name = 'FilePermissionError';
  }
}

import { uuid } from '@bangle.dev/core/utils/js-utils';
import { markdownParser, markdownSerializer } from '../markdown/index';
import { readFile } from '../misc/index';
const DIR_IGNORE_LIST = ['node_modules', '.git'];

export class FSStorage {
  // TODO check if the new directory is something we already have
  // in our database
  static async createInstance(dirHandle, schema) {
    dirHandle = await pickADirectory(dirHandle);
    if (!(await verifyPermission(dirHandle))) {
      throw new NoPermissionError('Permission denied by user');
    }
    const instance = new FSStorage(dirHandle, schema);
    await instance._updateFilePathHandles();
    return instance;
  }

  static getFilePathKey = (filePathHandles) => {
    return filePathHandles.map((r) => r.name).join('/');
  };

  constructor(dirHandle, schema) {
    this.dirHandle = dirHandle;
    this._schema = schema;
  }

  _getData = async (filePathHandles) => {
    const file = await getLast(filePathHandles).getFile();
    const textContent = await readFile(file);
    const key = FSStorage.getFilePathKey(filePathHandles);
    const doc = markdownParser(textContent);
    return {
      key,
      doc: doc.toJSON(),
      metadata: { lastModified: file.lastModified },
    };
  };

  _updateFilePathHandles = async () => {
    this._filePathHandles = await recurseDirHandle(this.dirHandle, {
      allowedFile: (entry) => entry.name.endsWith('.md'),
      allowedDir: (entry) => !DIR_IGNORE_LIST.includes(entry.name),
    });
    return this._filePathHandles;
  };

  _findPathHandlersByKey = (key) => {
    return this._filePathHandles?.find(
      (paths) => FSStorage.getFilePathKey(paths) === key,
    );
  };

  async iterate(cb) {
    await this._updateFilePathHandles();

    await Promise.all(
      this._filePathHandles.map(async (filePathHandle, i) => {
        // const fileHandle = getLast(filePathHandle);
        const key = FSStorage.getFilePathKey(filePathHandle);
        cb(null, key, i);
      }),
    );
  }

  // TODO support created nested keys
  createNewItemKey(fileName = uuid(6)) {
    // root

    fileName = fileName.endsWith('.md') ? fileName : fileName + '.md';

    if (fileName.includes('/')) {
      return fileName;
    }

    return [this.dirHandle.name, fileName].join('/');

    // throw new Error('Not implemented');
  }

  async getItem(key) {
    const match = this._findPathHandlersByKey(key);

    if (match) {
      const { doc, metadata } = await this._getData(match);
      return { doc, metadata };
    }
  }

  async removeItem(key) {
    const match = this._findPathHandlersByKey(key);
    if (!match) {
      throw new Error(`Key ${key} not found`);
    }

    await match[match.length - 2].removeEntry(getLast(match).name);
    await this._updateFilePathHandles();
  }

  async setItem(key, value) {
    const _setItem = async (match) => {
      const handler = match[match.length - 1];
      let data = '';
      // When a new file is created initially the value.doc is null
      if (value.doc) {
        const doc = this._schema.nodeFromJSON(value.doc);
        data = markdownSerializer(doc);
      }
      await writeFile(handler, data);
      return;
    };

    let match = this._filePathHandles.find(
      (paths) => FSStorage.getFilePathKey(paths) === key,
    );

    if (match) {
      await _setItem(match);
      return;
    }

    // TODO currently this only creates rootlevel files
    // if not found attempt to create it
    const name = getLast(key.split('/'));
    await this.dirHandle.getFileHandle(name, { create: true });
    await this._updateFilePathHandles();
    match = this._filePathHandles.find(
      (paths) => FSStorage.getFilePathKey(paths) === key,
    );
    await _setItem(match);
    return;
  }
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

function getLast(array) {
  return array[array.length - 1];
}

export class NoPermissionError extends Error {
  constructor(errorCode, body) {
    super(body);
    this.errorCode = errorCode;
    this.body = body;
    Error.captureStackTrace(this, NoPermissionError);
    this.name = this.constructor.name;
  }
}

async function pickADirectory(dirHandle) {
  if (dirHandle) {
    let permission = await verifyPermission(dirHandle);
    console.log('got permissions');
    if (!permission) {
      throw new NoPermissionError(
        'The permission to edit directory was denied',
      );
    }
  } else {
    try {
      dirHandle = await window.showDirectoryPicker();
    } catch (err) {
      console.error(err);
      throw new NoPermissionError(err.message);
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

export async function hasPermissions(dirHandle) {
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
  return (await dirHandle.requestPermission(opts)) === 'granted';
}

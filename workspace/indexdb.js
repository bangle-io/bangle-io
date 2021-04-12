import * as _idb from 'idb-keyval';
import './nativefs-helpers';
const idb = _idb; // new IO();

export class IndexDBIO {
  // file
  static async getFile(wsPath) {
    return idb.get(wsPath);
  }

  static async deleteFile(wsPath) {
    const file = await this.getFile(wsPath);
    if (!file) {
      throw new FileError(`File ${wsPath} does not exists`);
    }
    return idb.del(wsPath);
  }

  static async renameFile(wsPath, newWsPath) {
    const file = await this.getFile(wsPath);

    if (!file) {
      throw new FileError(`File ${wsPath} does not exists`);
    }

    const newFile = await this.getFile(newWsPath);

    if (newFile) {
      throw new FileError(`File ${newWsPath} already exists`);
    }

    await this.deleteFile(wsPath);
    return this.createFile(newWsPath, file);
  }

  static async createFile(wsPath, payload) {
    if (await this.getFile(wsPath)) {
      throw new FileError(`File ${wsPath} already exists`);
    }
    return idb.set(wsPath, payload);
  }

  static async updateFile(wsPath, payload) {
    if (!(await this.getFile(wsPath))) {
      throw new FileError(`File ${wsPath} does not exists`);
    }
    return idb.set(wsPath, payload);
  }

  static async listFiles(wsName) {
    // it might be a good idea in future to clean up dead
    // files whose workspaces do not exist
    const keys = (await idb.keys()) || [];

    return keys.filter((k) => k.startsWith(wsName + ':'));
  }
}

export class FileError extends Error {
  constructor(message) {
    super('FileError: ' + message);
    this.name = 'FileError';
  }
}

import * as idb from 'idb-keyval';

export class FileOps {
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
export class FilePermissionError extends Error {
  constructor(message) {
    super('FilePermissionError: ' + message);
    this.name = 'FilePermissionError';
  }
}

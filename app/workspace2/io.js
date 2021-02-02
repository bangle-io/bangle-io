import * as idb from 'idb-keyval';
// TODO: remove uid in the structure of workspace

export class NativeFS {
  static async listWorkspaces() {
    const workspaces = (await idb.get('workspaces/1')) || [];
    return workspaces.filter((r) => r.uid.startsWith('native'));
  }

  static deleteFile() {}

  static createFile() {}
}

export class BrowserFS {
  static async createWorkspace(wsName, type = 'browser') {
    const workspaces = this.listWorkspaces();

    if (workspaces.find((w) => w.name === wsName)) {
      throw new Error(`Workspace ${wsName} exist`);
    }

    workspaces.push({
      name: wsName,
      type,
    });

    await idb.set('workspaces_browser/1', workspaces);
  }

  static async listWorkspaces() {
    let ws = (await idb.get('workspaces_browser/1')) || [];

    return ws;
  }

  static async validWorkspace(wsName) {
    const workspaces = await this.listWorkspaces();
    if (!workspaces.find((w) => w.name === wsName)) {
      throw new Error(`${wsName} workspace not found`);
    }
  }

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
    await this.deleteFile(wsPath);
    return this.createFile(newWsPath, file);
  }

  static async createFile(wsPath, payload) {
    if (this.getFile(wsPath)) {
      throw new FileError(`File ${wsPath} already exists`);
    }
    return idb.set(wsPath, payload);
  }

  static async updateFile(wsPath, payload) {
    if (!this.getFile(wsPath)) {
      throw new FileError(`File ${wsPath} does not exists`);
    }
    return idb.set(wsPath, payload);
  }

  static async listFiles(wsName) {
    await this.validWorkspace(wsName);
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

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
  static async createWorkspace(wsName) {
    const workspaces = (await idb.get('workspaces_browser/1')) || [];
    workspaces.push({
      name: wsName,
      type: 'browser',
    });

    await idb.set('workspaces_browser/1', workspaces);
  }

  static async listWorkspaces() {
    let olderStyleWs = (await idb.get('workspaces/1')) || [];
    olderStyleWs = olderStyleWs
      .filter((r) => r)
      .filter((r) => r.uid.startsWith('indexdb'));

    let ws = (await idb.get('workspaces_browser/1')) || [];

    return ws.concat(olderStyleWs);
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
    return idb.del(wsPath);
  }

  static async renameFile(wsPath, newWsPath) {
    const file = await this.getFile(wsPath);
    await this.deleteFile(wsPath);
    return this.createFile(newWsPath, file);
  }

  static async createFile(wsPath, payload) {
    return idb.set(wsPath, payload);
  }

  static async updateFile(wsPath, payload) {
    return idb.set(wsPath, payload);
  }

  static async listFiles(wsName) {
    await this.validWorkspace(wsName);
    const keys = (await idb.keys()) || [];

    // check if workspace exists if not handle
    return keys.filter((k) => k.startsWith(wsName + ':'));
  }
}

window.BrowserFS = BrowserFS;
window.NativeFS = NativeFS;

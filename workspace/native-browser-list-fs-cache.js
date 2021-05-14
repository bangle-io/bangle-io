const cacheableFSType = (workspaceInfo) => workspaceInfo.type === 'nativefs';

const LOG = false;

let log = LOG
  ? console.log.bind(console, 'workspace/native-browser-list-fs-cache')
  : () => {};

class ListFilesCache {
  constructor() {
    this._cache = new WeakMap();
  }

  deleteEntry(workspaceInfo) {
    if (!cacheableFSType(workspaceInfo)) {
      return;
    }
    this._cache.delete(workspaceInfo.metadata.rootDirHandle);
    log('deleted entry', workspaceInfo.name);
  }

  saveEntry(workspaceInfo, data) {
    if (!cacheableFSType(workspaceInfo)) {
      return;
    }
    this._cache.set(workspaceInfo.metadata.rootDirHandle, data);
    log('saved entry', workspaceInfo.name);
  }

  getEntry(workspaceInfo) {
    if (!cacheableFSType(workspaceInfo)) {
      return undefined;
    }
    const result = this._cache.get(workspaceInfo.metadata.rootDirHandle);

    if (result) {
      log('Cache hit', workspaceInfo.name, result.length);
    } else {
      log('cache miss entry', workspaceInfo.name);
    }

    return result;
  }
}

export const listFilesCache = new ListFilesCache();

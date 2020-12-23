import localforage from 'localforage';
import { getTypeFromUID, isUidIndexdb } from './type-helpers';
import { hasPermissions } from './native-fs-driver';
const LOG = false;

let log = LOG ? console.log.bind(console, 'play/workspaces-info') : () => {};

// TODO break this into a group of functions please
// no reason for it to be stateful
export class WorkspacesInfo {
  static validateEntry(entry) {
    const { name, uid, metadata } = entry;

    if (!name || !uid || !metadata) {
      log(entry);
      throw new Error('Missing field in entry');
    }
    if (Object.keys(entry).length > 3) {
      log(entry);
      throw new Error('Extra fields in entry');
    }
    getTypeFromUID(uid);
  }

  static async needsPermission(entry) {
    if (isUidIndexdb(entry.uid)) {
      return false;
    }
    const { dirHandle } = entry.metadata;
    return !(await hasPermissions(dirHandle));
  }

  static async list() {
    const instance = localforage.createInstance({
      name: 'workspaces/1',
    });

    const existing = await instance.getItem('workspaces');

    return Object.values(existing || {}).sort((a, b) => {
      if (a.metadata?.lastModified || b.metadata?.lastModified) {
        return (
          (b.metadata?.lastModified || 0) - (a.metadata?.lastModified || 0)
        );
      }
      return getTypeFromUID(a.uid).localeCompare(getTypeFromUID(b.uid));
    });
  }

  static async delete(uid) {
    const instance = localforage.createInstance({
      name: 'workspaces/1',
    });
    const existing = await instance.getItem('workspaces');

    delete existing[uid];
    await instance.setItem('workspaces', existing);
  }

  instance = localforage.createInstance({
    name: 'workspaces/1',
  });

  _getWorkspaces = async () =>
    (await this.instance.getItem('workspaces')) || {};

  async update(entry) {
    WorkspacesInfo.validateEntry(entry);

    const existing = await this._getWorkspaces();
    const { name, uid, metadata } = entry;
    // log({ entry });

    const entryMatch = existing[uid];

    if (entryMatch) {
      entryMatch.metadata = metadata;
      entryMatch.name = name;
    } else {
      existing[uid] = {
        uid,
        name: name,
        metadata: metadata,
      };
    }

    log(existing);
    await this.instance.setItem('workspaces', existing);
  }
}

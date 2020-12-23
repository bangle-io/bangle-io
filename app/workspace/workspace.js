import localforage from 'localforage';
import { downloadJSON } from '../misc/index';
import { getIdleCallback } from '@bangle.dev/core/utils/js-utils';
import { FSStorage } from './native-fs-driver';
import { IndexDbWorkspaceFile } from './workspace-file';
import { WorkspacesInfo } from './workspaces-info';
import {
  createUidFromType,
  NATIVE_FS_TYPE,
  getTypeFromUID,
} from './type-helpers';
const LOG = false;

let log = LOG ? console.log.bind(console, 'play/workspace') : () => {};

// TODO if a file fails to open for whatever reason donot fail
// allow user to open another file
export class Workspace {
  /**
   * @type {WorkspaceFile[]}
   */
  files;

  static validateOpts = (opts) => {
    if (!opts.name) {
      throw new Error(`Opts name is required`);
    }
    if (!opts.schema) {
      throw new Error(`Opts schema is required`);
    }
    if (!opts.metadata) {
      throw new Error(`Opts metadata is required`);
    }
  };

  constructor(uid, files, type, opts) {
    if (!uid.startsWith('indexdb_') && !uid.startsWith('native_')) {
      throw new Error('malformed uid');
    }
    if (getTypeFromUID(uid) === 'native' && !opts.metadata.dirHandle) {
      throw new Error('Need dirHandle');
    }

    Workspace.validateOpts(opts);

    this.workspacesInfo = new WorkspacesInfo();
    this.uid = uid;
    this.type = type;
    this._opts = opts;
    this.deleted = false;
    this.files = files.sort((a, b) => a.docName.localeCompare(b.docName));
    const { name, metadata } = opts;
    this.name = name;
    this.metadata = metadata;
    this.metadata.lastModified = Date.now();
  }

  createNew(...args) {
    throw new Error('Implement');
  }

  toJSON() {
    return {
      name: this.name,
      files: this.files.map((f) => f.toJSON()),
      metadata: this.metadata,
    };
  }

  async persistWorkspace() {
    if (this.deleted) {
      return;
    }
    await this.workspacesInfo.update({
      uid: this.uid,
      name: this.name,
      metadata: this.metadata,
    });
  }

  async deleteWorkspace() {
    if (this.deleted) {
      return;
    }
    await WorkspacesInfo.delete(this.uid);
    this.deleted = true;
  }

  async rename(newName) {
    if (!newName || typeof newName !== 'string') {
      throw new Error('Invalid name');
    }

    this.name = newName;
    await this.persistWorkspace();
    return this;
  }

  getFile(docName) {
    return this.files.find((file) => file.docName === docName);
  }

  hasFile(docName) {
    return Boolean(this.getFile(docName));
  }

  linkFile(file) {
    return this.updateFiles([...this.files, file]);
  }

  unlinkFile(file) {
    return this.updateFiles(
      this.files.filter((f) => f.docName !== file.docName),
    );
  }

  downloadBackup() {
    const data = this.toJSON();
    downloadJSON(data, `${this.name}_${this.uid}.json`);
  }
}

export class IndexDbWorkspace extends Workspace {
  static getDbInstance = async (uid, metadata, schema) => {
    if (!metadata) {
      throw new Error('metadata needed');
    }
    if (!schema) {
      throw new Error('schema needed');
    }

    if (uid.startsWith(NATIVE_FS_TYPE)) {
      return FSStorage.createInstance(metadata.dirHandle, schema);
    }

    return localforage.createInstance({
      name: uid,
    });
  };

  static async restoreWorkspaceFromBackupFile(data, schema, type) {
    const uid = createUidFromType(type);
    const dbInstance = await IndexDbWorkspace.getDbInstance(uid, {}, schema);

    let { name, files, metadata } = data;

    // old style backup
    if (Array.isArray(data)) {
      name = 'pyare-mohan' + Math.floor(100 * Math.random());
      files = await Promise.all(
        data.map((item) =>
          IndexDbWorkspaceFile.fromJSON(item, { schema, dbInstance }),
        ),
      );
      metadata = {};
    } else {
      files = await Promise.all(
        files.map((item) =>
          IndexDbWorkspaceFile.fromJSON(item, { schema, dbInstance }),
        ),
      );
    }

    if (getTypeFromUID(uid) === 'native') {
      metadata.dirHandle = dbInstance.dirHandle;
    }

    const opts = {
      dbInstance,
      schema,
      metadata,
      name,
    };

    const instance = new IndexDbWorkspace(uid, files, type, opts);
    await instance.persistWorkspace();
    return instance;
  }

  static async openWorkspace(uid, name, schema, metadata = {}) {
    const dbInstance = await IndexDbWorkspace.getDbInstance(
      uid,
      metadata,
      schema,
    );

    if (getTypeFromUID(uid) === 'native') {
      metadata.dirHandle = dbInstance.dirHandle;
    }

    const opts = {
      name,
      dbInstance,
      schema,
      metadata,
    };
    let files = await IndexDbWorkspaceFile.getAllFilesInDb(opts);

    const instance = new IndexDbWorkspace(
      uid,
      files,
      getTypeFromUID(uid),
      opts,
    );
    await instance.persistWorkspace();
    return instance;
  }

  static openExistingWorkspace(workspaceInfo, schema) {
    const { uid, name, metadata } = workspaceInfo;

    return IndexDbWorkspace.openWorkspace(uid, name, schema, metadata);
  }

  static async createWorkspace(name, schema, type) {
    const uid = createUidFromType(type);
    return IndexDbWorkspace.openWorkspace(uid, name, schema);
  }

  updateFiles(files) {
    return new IndexDbWorkspace(this.uid, files, this.type, this._opts);
  }

  getLastModifiedFile() {
    return this.files.sort((a, b) => {
      return b.lastModified - a.lastModified;
    })[0];
  }
  /**
   * TODO remove this, no need to put it in here
   */
  async createFile(docName, doc) {
    return IndexDbWorkspaceFile.createFile(docName, doc, undefined, this._opts);
  }

  async deleteWorkspace() {
    if (this.deleted) {
      return;
    }

    super.deleteWorkspace();
    let files = await IndexDbWorkspaceFile.getAllFilesInDb(this._opts);
    files.forEach((value) => {
      value.delete();
    });
    // TODO implement this for nativefs
    getIdleCallback(() => {
      localforage.dropInstance({ name: this.uid });
    });
  }
}

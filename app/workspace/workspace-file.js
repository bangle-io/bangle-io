import { uuid } from '@bangle.dev/core/utils/js-utils';

export class WorkspaceFile {
  static fromJSON() {}

  constructor(docName, doc, metadata = {}, opts) {
    if (!docName) {
      throw new Error('Docname needed');
    }

    if (doc === undefined) {
      throw new Error('Doc needed, though it can be null');
    }

    if (!opts.schema) {
      throw new Error('No schema');
    }

    this._schema = opts.schema;
    this.metadata = metadata;
    this.docName = docName;
    this.doc = doc;
    this.deleted = false;
  }

  get lastModified() {
    return this.metadata.lastModified || Date.now();
  }

  toJSON() {
    return {
      metadata: this.metadata,
      docName: this.docName,
      doc: this.doc,
    };
  }

  /**
   * @returns {String}
   */
  get title() {
    // TODO handle the case from schema nodeFromJSON
    const letHydratedDoc =
      this.doc?.content && this._schema.nodeFromJSON(this.doc);
    return letHydratedDoc?.firstChild?.textContent || this.docName;
  }

  async updateDoc(doc) {}

  delete() {
    this.deleted = true;
  }
}

export class IndexDbWorkspaceFile extends WorkspaceFile {
  static validateOpts(opts) {
    if (!opts.dbInstance) {
      throw new Error('Db Instance not found');
    }
    if (!opts.schema) {
      throw new Error('Db Instance not found');
    }
  }

  static async fromJSON(data, opts) {
    IndexDbWorkspaceFile.validateOpts(opts);
    const { doc, docName, metadata } = data;
    if (!data.doc || !data.docName) {
      throw new Error('Doc and docName are necessary');
    }
    return IndexDbWorkspaceFile.createFile(docName, doc, metadata, opts);
  }

  static async openFile(docName, opts) {
    IndexDbWorkspaceFile.validateOpts(opts);

    const data = await opts.dbInstance.getItem(docName);
    if (data) {
      const { doc, metadata } = data;
      return new IndexDbWorkspaceFile(docName, doc, metadata, opts);
    }

    throw new Error('File not found');
  }

  static async getAllFilesInDb(opts) {
    IndexDbWorkspaceFile.validateOpts(opts);

    const dbInstance = opts.dbInstance;
    return iterateIndexDb(dbInstance).then((docNames) => {
      return Promise.all(
        docNames.map((docName) => IndexDbWorkspaceFile.openFile(docName, opts)),
      );
    });
  }

  static async createFile(suggestedDocName, doc, metadata, opts) {
    IndexDbWorkspaceFile.validateOpts(opts);
    let docName;
    // TODO streamline this
    // This option is used when using native fs
    if (opts.dbInstance.createNewItemKey) {
      docName = opts.dbInstance.createNewItemKey(suggestedDocName);
    } else {
      docName = suggestedDocName;
      if (!suggestedDocName) {
        docName = uuid(6);
      }
    }

    const data = await opts.dbInstance.getItem(docName);
    if (data) {
      console.warn('File already exists');
    }

    const file = new IndexDbWorkspaceFile(docName, doc, metadata, opts);
    await file.updateDoc();
    return file;
  }

  _dbInstance = null;

  constructor(docName, doc, metadata, opts) {
    metadata = {
      lastModified: Date.now(),
      ...metadata,
    };

    super(docName, doc, metadata, opts);
    IndexDbWorkspaceFile.validateOpts(opts);
    this._dbInstance = opts.dbInstance;
  }

  async delete() {
    super.delete();
    await this._dbInstance.removeItem(this.docName);
  }

  async updateDoc(newDoc, metadata = {}) {
    if (this.deleted) {
      return;
    }

    if (newDoc) {
      this.doc = newDoc;
    }

    await this._dbInstance.setItem(this.docName, {
      doc: this.doc,
      docName: this.docName,
      metadata,
    });
  }
}

function iterateIndexDb(indexDbInstance) {
  const result = [];
  return indexDbInstance
    .iterate((value, key, iterationNumber) => {
      result.push(key);
    })
    .then(() => {
      return result;
    });
}

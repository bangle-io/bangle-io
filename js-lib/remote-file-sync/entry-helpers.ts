import type { Merge } from 'type-fest';

import { calculateGitFileSha } from '@bangle.io/git-file-sha';

export interface SourceType {
  file: File;
  sha: string;
}

export type PlainObjEntry = {
  uid: string;
  sha: string;
  file: File;
  deleted: number | undefined;
  source: SourceType | undefined;
};

export class BaseFileEntry {
  static fromPlainObj(obj: ConstructorParameters<typeof BaseFileEntry>[0]) {
    return new BaseFileEntry(obj);
  }

  readonly uid: string;
  readonly sha: string;
  readonly file: File;
  readonly deleted: number | undefined;

  constructor({
    uid,
    sha,
    file,
    deleted,
  }: {
    uid: BaseFileEntry['uid'];
    sha: BaseFileEntry['sha'];
    file: BaseFileEntry['file'];
    deleted: BaseFileEntry['deleted'];
  }) {
    this.uid = uid;
    this.sha = sha;
    this.file = file;
    this.deleted = deleted;
  }

  toPlainObj(): PlainObjEntry {
    return {
      uid: this.uid,
      sha: this.sha,
      file: this.file,
      deleted: this.deleted,
      source: undefined,
    };
  }
}

export class LocalFileEntry extends BaseFileEntry {
  static fromPlainObj(obj: ConstructorParameters<typeof LocalFileEntry>[0]) {
    return new LocalFileEntry(obj);
  }

  static async newFile(
    obj: Omit<
      ConstructorParameters<typeof BaseFileEntry>[0],
      'sha' | 'deleted'
    >,
  ) {
    return new LocalFileEntry({
      ...obj,
      sha: await calculateGitFileSha(obj.file),
      // a new locally created file cannot be created as deleted
      deleted: undefined,
      // a new file does not have source
      source: undefined,
    });
  }

  readonly source: // source will be undefined for a file that was newly created
  | undefined
    | {
        readonly sha: string;
        readonly file: File;
      };

  constructor(
    obj: Merge<
      ConstructorParameters<typeof BaseFileEntry>[0],
      { source: SourceType | undefined }
    >,
  ) {
    super(obj);
    this.source = obj.source;
  }

  get isDeleted() {
    return typeof this.deleted === 'number';
  }

  // a 'file.isModified == true' means that it was modified locally w.r.t its source content
  get isModified() {
    return this.sha !== this.source?.sha;
  }

  get isNew() {
    return this.source == null;
  }

  get isUntouched() {
    if (this.isNew) {
      return false;
    }
    // TODO what does it mean if source is deleted
    // we are marking isUntouched = false to a deleted file, but
    // we want to keep it isUntouched = true if the source was also deleted.
    if (this.isDeleted) {
      return false;
    }
    if (this.isModified) {
      return false;
    }

    return true;
  }

  markDeleted() {
    return new LocalFileEntry({
      ...this,
      deleted: Date.now(),
    });
  }

  toPlainObj(): PlainObjEntry {
    return {
      uid: this.uid,
      sha: this.sha,
      file: this.file,
      deleted: this.deleted,
      source: this.source,
    };
  }

  async updateFile(file: File): Promise<LocalFileEntry> {
    const newSha = await calculateGitFileSha(file);

    if (newSha === this.sha && this.deleted == null) {
      return this;
    }

    return new LocalFileEntry({
      ...this,
      // unset deleted if file is updated
      deleted: undefined,
      file: file,
      sha: newSha,
    });
  }

  async updateSource(file: File) {
    const newSha = await calculateGitFileSha(file);

    if (this.source?.sha === newSha) {
      return this;
    }

    return new LocalFileEntry({
      ...this,
      source: {
        sha: newSha,
        file: file,
      },
    });
  }
}

export class RemoteFileEntry extends BaseFileEntry {
  static async newFile(
    obj: Omit<ConstructorParameters<typeof BaseFileEntry>[0], 'sha'>,
  ) {
    return new RemoteFileEntry({
      ...obj,
      sha: await calculateGitFileSha(obj.file),
    });
  }

  forkLocalFileEntry(): LocalFileEntry {
    return new LocalFileEntry({
      ...this,
      source: {
        file: this.file,
        sha: this.sha,
      },
    });
  }
}

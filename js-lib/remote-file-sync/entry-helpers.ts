interface SourceType {
  file: File;
  sha: string;
}

/**
 * Use when a new local file is created, without a remote counterpart.
 */
export function makeLocallyCreatedEntry(
  obj: Omit<PlainObjEntry, 'deleted' | 'source'>,
): PlainObjEntry {
  return {
    ...obj,
    // a new locally created file cannot be created as deleted
    deleted: undefined,
    // a new file does not have source, since it was created locally
    // and hasn't been synced with the remote yet
    source: undefined,
  };
}

/**
 * Use to create an entry which is a copy of the remote counterpart.
 */
export function makeLocalEntryFromRemote(
  obj: Omit<PlainObjEntry, 'deleted' | 'source'>,
): PlainObjEntry {
  return {
    ...obj,
    // a new entry from remote shouldn't be deleted
    deleted: undefined,
    source: {
      file: obj.file,
      sha: obj.sha,
    },
  };
}

/*
 * a 'file.isModified == true' means that it was modified locally 
  w.r.t its source content
 */
export function isEntryModified(entry: PlainObjEntry): boolean {
  return entry.sha !== entry.source?.sha;
}

export function isEntryNew(entry: PlainObjEntry): boolean {
  return entry.source == null;
}

export function isEntryDeleted(entry: PlainObjEntry): boolean {
  return typeof entry.deleted === 'number';
}

export function isEntryUntouched(entry: PlainObjEntry): boolean {
  if (isEntryNew(entry)) {
    return false;
  }
  // TODO what does it mean if source is deleted
  // we are marking isUntouched = false to a deleted file, but
  // we want to keep it isUntouched = true if the source was also deleted.
  if (isEntryDeleted(entry)) {
    return false;
  }
  if (isEntryModified(entry)) {
    return false;
  }

  return true;
}

export interface PlainObjEntry {
  uid: string;
  sha: string;
  file: File;
  deleted: number | undefined;
  source: SourceType | undefined;
}

class BaseFileEntry {
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

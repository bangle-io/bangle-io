import type { Merge } from 'type-fest';

import { BaseError } from '@bangle.io/base-error';

import { calculateGitFileSha } from './calculate-git-file-sha';
import { REMOTE_SYNC_NOT_ALLOWED_ERROR } from './errors';

// allow writing to a file if delete happened after this time
// essentially reverting a delete
const DELETE_TOLERANCE = 2000;

export class LocalFileEntryManager {
  constructor(
    private persistenceProvider: {
      get: (key: string) => Promise<any | undefined>;
      set: (key: string, obj: any) => Promise<void>;
      entries: () => Promise<[string, any][]>;
      delete: (key: string) => Promise<void>;
    },
  ) {}

  private async getFileEntry(uid: string): Promise<LocalFileEntry | undefined> {
    const obj = await this.persistenceProvider.get(uid);

    if (obj) {
      return LocalFileEntry.fromPlainObj(obj);
    }
    return undefined;
  }

  private async updateFileEntry(fileEntry: LocalFileEntry): Promise<void> {
    return this.persistenceProvider.set(fileEntry.uid, fileEntry.toPlainObj());
  }

  private isRecentlyDeleted(fileEntry: LocalFileEntry | undefined) {
    return (
      typeof fileEntry?.deleted === 'number' &&
      Date.now() - fileEntry.deleted < DELETE_TOLERANCE
    );
  }

  async getAllEntries(): Promise<LocalFileEntry[]> {
    return this.persistenceProvider.entries().then((entries) => {
      return entries.map((r) => LocalFileEntry.fromPlainObj(r[1]));
    });
  }

  // returns all local and remote file uids that have not been deleted
  async listFiles(listRemoteFiles: () => Promise<string[]>): Promise<string[]> {
    let localEntries = await this.getAllEntries();
    const localFiles = localEntries
      .filter((fileEntry) => {
        // only include files that are modified and not deleted
        return fileEntry.isModified === true && fileEntry.deleted == null;
      })
      .map((r) => r.uid);

    const locallyDeletedFiles = new Set(
      localEntries
        .filter((r) => typeof r.deleted === 'number')
        .map((r) => r.uid),
    );

    const remoteFiles = (await listRemoteFiles()).filter(
      // omit files that were locally deleted
      (r) => !locallyDeletedFiles.has(r),
    );

    return Array.from(new Set([...localFiles, ...remoteFiles])).sort();
  }

  async deleteFile(
    uid: string,
    getRemoteFileEntry?: (uid: string) => Promise<RemoteFileEntry | undefined>,
  ) {
    const fileEntry = await this.getFileEntry(uid);

    if (fileEntry) {
      if (fileEntry.deleted) {
        return;
      }
      await this.updateFileEntry(fileEntry.markDeleted());
    } else {
      const remoteFileEntry = await getRemoteFileEntry?.(uid);
      if (remoteFileEntry) {
        await this.updateFileEntry(remoteFileEntry.fork().markDeleted());
      }
      // if file doesn't exist locally or source
      // do nothing
    }
  }

  async readFile(
    uid: string,
    getRemoteFileEntry: (uid: string) => Promise<RemoteFileEntry | undefined>,
  ): Promise<File | undefined> {
    const fileEntry = await this.getFileEntry(uid);

    if (fileEntry) {
      if (fileEntry.deleted) {
        return undefined;
      }
      return fileEntry.file;
    }

    const remoteFileEntry = await getRemoteFileEntry?.(uid);

    if (remoteFileEntry) {
      // update our local entry
      await this.updateFileEntry(remoteFileEntry.fork());

      return this.readFile(uid, getRemoteFileEntry);
    }

    return undefined;
  }

  async createFile(
    uid: string,
    file: File,
    getRemoteFileEntry: (uid: string) => Promise<RemoteFileEntry | undefined>,
  ) {
    const existingFile = await this.readFile(uid, getRemoteFileEntry);

    if (existingFile) {
      throw new BaseError({
        message: 'Cannot create as file already exists',
        code: REMOTE_SYNC_NOT_ALLOWED_ERROR,
      });
    }

    await this.updateFileEntry(
      await LocalFileEntry.newFile({
        uid,
        file,
      }),
    );
  }

  async updateFileSource(uid: string, sourceFile: File) {
    const fileEntry = await this.getFileEntry(uid);

    if (fileEntry) {
      await this.updateFileEntry(await fileEntry.updateSource(sourceFile));
    } else {
      throw new BaseError({
        message: 'Cannot updateFileSource as file does not exist',
        code: REMOTE_SYNC_NOT_ALLOWED_ERROR,
      });
    }
  }

  async writeFile(uid: string, file: File) {
    const fileEntry = await this.getFileEntry(uid);

    if (this.isRecentlyDeleted(fileEntry)) {
      throw new BaseError({
        message: 'Cannot write as file is deleted',
        code: REMOTE_SYNC_NOT_ALLOWED_ERROR,
      });
    }

    if (fileEntry) {
      await this.updateFileEntry(await fileEntry.updateFile(file));
    } else {
      throw new BaseError({
        message: 'Cannot write as file does not exist',
        code: REMOTE_SYNC_NOT_ALLOWED_ERROR,
      });
    }
  }
}

interface SourceType {
  file: File;
  sha: string;
}

export class BaseFileEntry {
  public readonly uid: string;
  public readonly sha: string;
  public readonly file: File;
  public readonly deleted: number | undefined;

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

  toPlainObj(): {
    [k in keyof ConstructorParameters<typeof BaseFileEntry>[0]]: any;
  } {
    return {
      uid: this.uid,
      sha: this.sha,
      file: this.file,
      deleted: this.deleted,
    };
  }

  static fromPlainObj(obj: ConstructorParameters<typeof BaseFileEntry>[0]) {
    return new BaseFileEntry(obj);
  }
}

export class LocalFileEntry extends BaseFileEntry {
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

  static fromPlainObj(obj: ConstructorParameters<typeof LocalFileEntry>[0]) {
    return new LocalFileEntry(obj);
  }

  public readonly source: // source will be undefined for a file that was newly created
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

  toPlainObj(): {
    [k in keyof ConstructorParameters<typeof LocalFileEntry>[0]]: any;
  } {
    return {
      uid: this.uid,
      sha: this.sha,
      file: this.file,
      deleted: this.deleted,
      source: this.source,
    };
  }

  get isModified() {
    return this.sha !== this.source?.sha;
  }

  get isNew() {
    return this.source == null;
  }

  markDeleted() {
    return new LocalFileEntry({
      ...this,
      deleted: Date.now(),
    });
  }

  async updateSource(file: File) {
    const newSha = await calculateGitFileSha(file);

    if (this.source?.sha === newSha) {
      return this;
    }

    return new LocalFileEntry({
      ...this,
      file: file,
      sha: newSha,
      source: {
        sha: newSha,
        file: file,
      },
    });
  }

  async updateFile(file: File): Promise<LocalFileEntry> {
    // TODO: can we rely on just file instance check for ruling
    // out no change
    if (this.file === file) {
      return this;
    }

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

  fork(): LocalFileEntry {
    return new LocalFileEntry({
      ...this,
      source: {
        file: this.file,
        sha: this.sha,
      },
    });
  }
}

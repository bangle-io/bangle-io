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

  private async getFileEntry(
    wsPath: string,
  ): Promise<LocalFileEntry | undefined> {
    const obj = await this.persistenceProvider.get(wsPath);

    if (obj) {
      return LocalFileEntry.fromIndexedDbObj(obj);
    }
    return undefined;
  }

  private async updateFileEntry(fileEntry: LocalFileEntry): Promise<void> {
    return this.persistenceProvider.set(
      fileEntry.wsPath,
      fileEntry.toIndexedDbObj(),
    );
  }

  private async getAllEntries(): Promise<LocalFileEntry[]> {
    return this.persistenceProvider.entries().then((entries) => {
      return entries.map((r) => LocalFileEntry.fromIndexedDbObj(r[1]));
    });
  }

  private isRecentlyDeleted(fileEntry: LocalFileEntry | undefined) {
    return (
      typeof fileEntry?.deleted === 'number' &&
      Date.now() - fileEntry.deleted < DELETE_TOLERANCE
    );
  }

  // returns all local and remote files that have not been deleted
  async listFiles(listRemoteFiles: () => Promise<string[]>): Promise<string[]> {
    let localEntries = await this.getAllEntries();
    const localFiles = localEntries
      .filter((fileEntry) => {
        // only include files that are modified and not deleted
        return fileEntry.isModified === true && fileEntry.deleted == null;
      })
      .map((r) => r.wsPath);

    const locallyDeletedFiles = new Set(
      localEntries
        .filter((r) => typeof r.deleted === 'number')
        .map((r) => r.wsPath),
    );

    const remoteFiles = (await listRemoteFiles()).filter(
      // omit files that were locally deleted
      (r) => !locallyDeletedFiles.has(r),
    );

    return Array.from(new Set([...localFiles, ...remoteFiles])).sort();
  }

  async deleteFile(
    wsPath: string,
    getRemoteFileEntry?: (
      wsPath: string,
    ) => Promise<RemoteFileEntry | undefined>,
  ) {
    const fileEntry = await this.getFileEntry(wsPath);

    if (fileEntry) {
      if (fileEntry.deleted) {
        throw new BaseError({
          message: 'File already deleted',
          code: REMOTE_SYNC_NOT_ALLOWED_ERROR,
        });
      }
      await this.updateFileEntry(fileEntry.markDeleted());
    } else {
      const remoteFileEntry = await getRemoteFileEntry?.(wsPath);
      if (remoteFileEntry) {
        if (remoteFileEntry.deleted) {
          throw new BaseError({
            message: 'File already deleted',
            code: REMOTE_SYNC_NOT_ALLOWED_ERROR,
          });
        }
        await this.updateFileEntry(remoteFileEntry.fork().markDeleted());
      }
      // if file doesn't exist locally or source
      // do nothing
    }
  }

  async readFile(
    wsPath: string,
    getRemoteFileEntry: (
      wsPath: string,
    ) => Promise<RemoteFileEntry | undefined>,
  ) {
    const fileEntry = await this.getFileEntry(wsPath);

    if (fileEntry) {
      if (fileEntry.deleted) {
        return undefined;
      }

      const remoteFileEntry = await getRemoteFileEntry?.(wsPath);

      if (fileEntry.isModified === false) {
        // if file is not modified and remote file has been deleted, mark the local file deleted
        if (remoteFileEntry && remoteFileEntry.deleted) {
          const newEntry = remoteFileEntry.fork();
          await this.updateFileEntry(newEntry);
          return undefined;
        }

        // if file is not modified and remote file has changed, update the local file
        if (
          remoteFileEntry &&
          remoteFileEntry.sha !== fileEntry.sha &&
          !remoteFileEntry.deleted
        ) {
          const newEntry = remoteFileEntry.fork();
          await this.updateFileEntry(newEntry);
          return newEntry.file;
        }
      }

      return fileEntry.file;
    } else {
      const remoteFileEntry = await getRemoteFileEntry?.(wsPath);

      if (remoteFileEntry) {
        // update our local entry
        await this.updateFileEntry(remoteFileEntry.fork());
      }

      return remoteFileEntry?.file;
    }
  }

  async createFile(
    wsPath: string,
    file: File,
    getRemoteFileEntry: (
      wsPath: string,
    ) => Promise<RemoteFileEntry | undefined>,
  ) {
    const existingFile = await this.readFile(wsPath, getRemoteFileEntry);

    if (existingFile) {
      throw new BaseError({
        message: 'Cannot create as file already exists',
        code: REMOTE_SYNC_NOT_ALLOWED_ERROR,
      });
    }

    await this.updateFileEntry(
      await LocalFileEntry.newFile({
        wsPath,
        file,
      }),
    );
  }

  async writeFile(wsPath: string, file: File) {
    const fileEntry = await this.getFileEntry(wsPath);

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

class BaseFileEntry {
  public readonly wsPath: string;
  public readonly sha: string;
  public readonly file: File;
  public readonly deleted: number | undefined;

  constructor({
    wsPath,
    sha,
    file,
    deleted,
  }: {
    wsPath: BaseFileEntry['wsPath'];
    sha: BaseFileEntry['sha'];
    file: BaseFileEntry['file'];
    deleted: BaseFileEntry['deleted'];
  }) {
    this.wsPath = wsPath;
    this.sha = sha;
    this.file = file;
    this.deleted = deleted;
  }

  toIndexedDbObj(): {
    [k in keyof ConstructorParameters<typeof BaseFileEntry>[0]]: any;
  } {
    return {
      wsPath: this.wsPath,
      sha: this.sha,
      file: this.file,
      deleted: this.deleted,
    };
  }

  static fromIndexedDbObj(obj: ConstructorParameters<typeof BaseFileEntry>[0]) {
    return new BaseFileEntry(obj);
  }
}

class LocalFileEntry extends BaseFileEntry {
  static async newFile(
    obj: Omit<
      ConstructorParameters<typeof BaseFileEntry>[0],
      'sha' | 'deleted'
    >,
  ) {
    return new LocalFileEntry({
      ...obj,
      sha: await calculateGitFileSha(obj.file),
      deleted: undefined,
      // a new file does not have source
      source: undefined,
    });
  }

  static fromIndexedDbObj(
    obj: ConstructorParameters<typeof LocalFileEntry>[0],
  ) {
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

  toIndexedDbObj(): {
    [k in keyof ConstructorParameters<typeof LocalFileEntry>[0]]: any;
  } {
    return {
      wsPath: this.wsPath,
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

  async updateFile(file: File): Promise<LocalFileEntry> {
    // TODO: can we rely on just file instance check for ruling
    // out no change
    if (this.file === file) {
      return this;
    }

    const newSha = await calculateGitFileSha(file);

    if (newSha === this.sha) {
      return this;
    }

    return new LocalFileEntry({
      ...this,
      // unset deleted if file is updated
      deleted: undefined,
      file: file,
      sha: await calculateGitFileSha(file),
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

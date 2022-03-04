import { BaseError } from '@bangle.io/utils';

import {
  FILE_ALREADY_DELETED,
  FILE_ALREADY_EXISTS_ERROR,
  FILE_DELETED,
  FILE_DOES_NOT_EXIST,
} from './errors';
import { getGitFileSha } from './helpers';

// allow writing to a file if delete happened after this time
// essentially reverting a delete
const DELETE_TOLERANCE = 2000;

export class LocalFileEntryManager {
  store = new Map<string, LocalFileEntry>();

  private async getFileEntry(
    wsPath: string,
  ): Promise<LocalFileEntry | undefined> {
    return this.store.get(wsPath);
  }

  private async updateFileEntry(fileEntry: LocalFileEntry): Promise<void> {
    this.store.set(fileEntry.wsPath, fileEntry);
  }

  private isRecentlyDeleted(fileEntry: LocalFileEntry | undefined) {
    return (
      typeof fileEntry?.deleted === 'number' &&
      Date.now() - fileEntry.deleted < DELETE_TOLERANCE
    );
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
          code: FILE_ALREADY_DELETED,
        });
      }
      await this.updateFileEntry(fileEntry.markDeleted());
    } else {
      const remoteFileEntry = await getRemoteFileEntry?.(wsPath);
      if (remoteFileEntry) {
        if (remoteFileEntry.deleted) {
          throw new BaseError({
            message: 'File already deleted',
            code: FILE_ALREADY_DELETED,
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
      const remoteFileEntry = await getRemoteFileEntry?.(wsPath);

      if (fileEntry.deleted || remoteFileEntry?.deleted) {
        return undefined;
      }

      // if file is not modified and remote file has changed update the local file
      if (
        remoteFileEntry &&
        fileEntry.isModified === false &&
        remoteFileEntry.sha !== fileEntry.sha
      ) {
        const newEntry = remoteFileEntry.fork();
        await this.updateFileEntry(newEntry);
        return newEntry.file;
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
        code: FILE_ALREADY_EXISTS_ERROR,
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
        code: FILE_DELETED,
      });
    }

    if (fileEntry) {
      await this.updateFileEntry(await fileEntry.updateFile(file));
    } else {
      throw new BaseError({
        message: 'Cannot write as file does not exist',
        code: FILE_DOES_NOT_EXIST,
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
    deleted?: BaseFileEntry['deleted'];
  }) {
    this.wsPath = wsPath;
    this.sha = sha;
    this.file = file;
    this.deleted = deleted;
  }
}

class LocalFileEntry extends BaseFileEntry {
  public readonly source: // source will be undefined for a file that was newly created
  | undefined
    | {
        readonly sha: string;
        readonly file: File;
      };

  static async newFile(
    obj: Omit<
      ConstructorParameters<typeof BaseFileEntry>[0],
      'sha' | 'deleted'
    >,
  ) {
    return new LocalFileEntry(
      { ...obj, sha: await getGitFileSha(obj.file) },
      // a new file does not have source
      undefined,
    );
  }

  constructor(
    obj: ConstructorParameters<typeof BaseFileEntry>[0],
    source?: SourceType,
  ) {
    super(obj);
    this.source = source;
  }

  get isModified() {
    return this.sha !== this.source?.sha;
  }

  get isNew() {
    return this.source == null;
  }

  markDeleted() {
    return new LocalFileEntry(
      {
        ...this,
        deleted: Date.now(),
      },
      this.source,
    );
  }

  async updateFile(file: File): Promise<LocalFileEntry> {
    // TODO: can we rely on just file instance check for ruling
    // out no change
    if (this.file === file) {
      return this;
    }

    const newSha = await getGitFileSha(file);

    if (newSha === this.sha) {
      return this;
    }

    return new LocalFileEntry(
      {
        ...this,
        // unset deleted if file is updated
        deleted: undefined,
        file: file,
        sha: await getGitFileSha(file),
      },
      this.source,
    );
  }
}

export class RemoteFileEntry extends BaseFileEntry {
  static async newFile(
    obj: Omit<ConstructorParameters<typeof BaseFileEntry>[0], 'sha'>,
  ) {
    return new RemoteFileEntry({
      ...obj,
      sha: await getGitFileSha(obj.file),
    });
  }

  fork(): LocalFileEntry {
    return new LocalFileEntry(
      {
        ...this,
      },
      {
        file: this.file,
        sha: this.sha,
      },
    );
  }
}

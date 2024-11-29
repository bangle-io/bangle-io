import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  IndexedDBFileSystem,
} from '@bangle.io/baby-fs';
import { BaseService, throwAppError } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import type {
  BaseFileStorageProvider,
  BaseServiceCommonOptions,
  FileStorageChangeEvent,
} from '@bangle.io/types';
import { fromFsPath, toFSPath } from '@bangle.io/ws-path';

export class FileStorageIndexedDB
  extends BaseService
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.Browser;
  public readonly displayName = 'Browser Storage';
  public readonly description = "Saves data in your browser's local storage";

  private _idb = new IndexedDBFileSystem();

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: undefined,
    private options: { onChange: (event: FileStorageChangeEvent) => void },
  ) {
    super({
      ...baseOptions,
      name: 'file-storage-indexeddb',
      kind: 'platform',
      dependencies,
    });
  }

  protected async onInitialize(): Promise<void> {}
  protected async onDispose(): Promise<void> {}

  private internalOnChange(event: FileStorageChangeEvent) {
    this.options.onChange(event);
  }

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.initialize;

    const path = toFSPath(wsPath);
    await this._idb.writeFile(path, file);

    this.internalOnChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.initialize;

    await this._idb.unlink(toFSPath(wsPath));
    this.internalOnChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.initialize;

    const path = toFSPath(wsPath);
    try {
      await this._idb.stat(path);

      return true;
    } catch (error) {
      if (error instanceof BaseFileSystemError) {
        if (error.code === FILE_NOT_FOUND_ERROR) {
          return false;
        }
      }
      throw error;
    }
  }

  async fileStat(wsPath: string) {
    await this.initialize;

    const path = toFSPath(wsPath);
    const stat = await this._idb.stat(path);

    return {
      ctime: stat.mtimeMs,
      mtime: stat.mtimeMs,
    };
  }

  isSupported() {
    return globalThis.indexedDB != null;
  }

  async listAllFiles(
    wsName: string,
    abortSignal: AbortSignal,
  ): Promise<string[]> {
    await this.initialize;

    const rawPaths: string[] = await this._idb.opendirRecursive(wsName);

    abortSignal.throwIfAborted();
    const files = rawPaths
      .map((r) => fromFsPath(r))
      .filter((r): r is string => Boolean(r));
    return files.sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.initialize;

    if (!(await this.fileExists(wsPath))) {
      return undefined;
    }

    return this._idb.readFile(toFSPath(wsPath));
  }

  async renameFile(
    wsPath: string,
    {
      newWsPath,
    }: {
      newWsPath: string;
    },
  ): Promise<void> {
    await this.initialize;

    await this._idb.rename(toFSPath(wsPath), toFSPath(newWsPath));

    this.internalOnChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    await this.initialize;

    if (!(await this.fileExists(wsPath))) {
      throwAppError(
        'error::file-storage:file-does-not-exist',
        'Cannot write file as it does not exist',
        {
          wsPath,
          storage: this.name,
        },
      );
    }

    const path = toFSPath(wsPath);
    await this._idb.writeFile(path, file);
    this.internalOnChange({
      type: 'update',
      wsPath,
    });
  }
}

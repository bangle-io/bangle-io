import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  IndexedDBFileSystem,
} from '@bangle.io/baby-fs';
import {
  BaseService2,
  type BaseServiceContext,
  throwAppError,
} from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import type {
  BaseFileStorageProvider,
  BaseServiceCommonOptions,
  FileStorageChangeEvent,
} from '@bangle.io/types';
import { fromFsPath, toFSPath } from '@bangle.io/ws-path';

export class FileStorageIndexedDB
  extends BaseService2
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.Browser;
  public readonly displayName = 'Browser Storage';
  public readonly description = "Saves data in your browser's local storage";

  private _idb = new IndexedDBFileSystem();

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: { onChange: (event: FileStorageChangeEvent) => void },
  ) {
    super('file-storage-indexeddb', context, dependencies);
  }

  async hookMount(): Promise<void> {}

  private internalOnChange(event: FileStorageChangeEvent) {
    this.config.onChange(event);
  }

  private getFsPath(wsPath: string) {
    const fsPath = toFSPath(wsPath);
    if (!fsPath) {
      throwAppError('error::ws-path:invalid-ws-path', 'Invalid path', {
        invalidPath: wsPath,
      });
    }
    return fsPath;
  }

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;

    const path = this.getFsPath(wsPath);
    await this._idb.writeFile(path, file);

    this.internalOnChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.mountPromise;

    await this._idb.unlink(this.getFsPath(wsPath));
    this.internalOnChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.mountPromise;

    const path = this.getFsPath(wsPath);
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
    await this.mountPromise;

    const path = this.getFsPath(wsPath);
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
    await this.mountPromise;

    const rawPaths: string[] = await this._idb.opendirRecursive(wsName);

    abortSignal.throwIfAborted();
    const files = rawPaths
      .map((r) => fromFsPath(r))
      .filter((r): r is string => Boolean(r));
    return files.sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;

    if (!(await this.fileExists(wsPath))) {
      return undefined;
    }

    return this._idb.readFile(this.getFsPath(wsPath));
  }

  async renameFile(
    wsPath: string,
    {
      newWsPath,
    }: {
      newWsPath: string;
    },
  ): Promise<void> {
    await this.mountPromise;

    await this._idb.rename(this.getFsPath(wsPath), this.getFsPath(newWsPath));

    this.internalOnChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;

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

    const path = this.getFsPath(wsPath);
    await this._idb.writeFile(path, file);
    this.internalOnChange({
      type: 'update',
      wsPath,
    });
  }
}

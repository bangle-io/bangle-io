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
import { SERVICE_NAME, WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import type {
  BaseFileStorageProvider,
  FileStorageChangeEvent,
} from '@bangle.io/types';
import { fromFsPath, toFSPath } from '@bangle.io/ws-path';

type Config = {
  onChange: (event: FileStorageChangeEvent) => void;
};

export class FileStorageIndexedDB
  extends BaseService2
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.Browser;
  public readonly displayName = 'Browser Storage';
  public readonly description = "Saves data in your browser's local storage";

  private idb = new IndexedDBFileSystem();
  private onChange: (event: FileStorageChangeEvent) => void;

  constructor(context: BaseServiceContext, dependencies: null, config: Config) {
    super(SERVICE_NAME.fileStorageIndexedDBService, context, dependencies);
    this.onChange = config.onChange;
  }

  async hookMount(): Promise<void> {}

  private emitChange(event: FileStorageChangeEvent) {
    this.onChange(event);
  }

  private getFsPath(wsPath: string): string {
    const fsPath = toFSPath(wsPath);
    if (!fsPath) {
      throwAppError(
        'error::ws-path:invalid-ws-path',
        'Invalid workspace path',
        {
          invalidPath: wsPath,
        },
      );
    }
    return fsPath;
  }

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const fsPath = this.getFsPath(wsPath);
    await this.idb.writeFile(fsPath, file);

    this.emitChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.mountPromise;
    const fsPath = this.getFsPath(wsPath);
    await this.idb.unlink(fsPath);

    this.emitChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.mountPromise;
    const fsPath = this.getFsPath(wsPath);

    try {
      await this.idb.stat(fsPath);
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
    const fsPath = this.getFsPath(wsPath);
    const stat = await this.idb.stat(fsPath);

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

    const rawPaths: string[] = await this.idb.opendirRecursive(wsName);
    abortSignal.throwIfAborted();

    return rawPaths
      .map(fromFsPath)
      .filter((path): path is string => Boolean(path))
      .sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;

    if (!(await this.fileExists(wsPath))) {
      return undefined;
    }
    const fsPath = this.getFsPath(wsPath);
    return this.idb.readFile(fsPath);
  }

  async renameFile(
    wsPath: string,
    { newWsPath }: { newWsPath: string },
  ): Promise<void> {
    await this.mountPromise;
    const oldFsPath = this.getFsPath(wsPath);
    const newFsPath = this.getFsPath(newWsPath);

    await this.idb.rename(oldFsPath, newFsPath);

    this.emitChange({
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
    const fsPath = this.getFsPath(wsPath);
    await this.idb.writeFile(fsPath, file);

    this.emitChange({
      type: 'update',
      wsPath,
    });
  }
}

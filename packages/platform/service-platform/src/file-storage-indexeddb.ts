import {
  BaseFileSystemError,
  FILE_ALREADY_EXISTS_ERROR,
  FILE_NOT_FOUND_ERROR,
  IndexedDBFileSystem,
} from '@bangle.io/baby-fs';
import {
  BaseService,
  type BaseServiceContext,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  FILE_STORAGE_MAX_FILE_SIZE_BYTES,
  SERVICE_NAME,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
import type {
  BaseFileStorageProvider,
  FileStorageChangeEvent,
} from '@bangle.io/types';
import { toFSPathOrThrow, WsPath } from '@bangle.io/ws-path';

type Config = {
  onChange: (event: FileStorageChangeEvent) => void;
};

export class FileStorageIndexedDB
  extends BaseService
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.Browser;
  public readonly maxFileSizeBytes = FILE_STORAGE_MAX_FILE_SIZE_BYTES.browser;

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

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const fsPath = toFSPathOrThrow(wsPath);
    try {
      await this.idb.createFile(fsPath, file);
    } catch (error) {
      if (
        error instanceof BaseFileSystemError &&
        error.code === FILE_ALREADY_EXISTS_ERROR
      ) {
        throwAppError('error::file:already-existing', 'File already exists', {
          wsPath,
        });
      }
      throw error;
    }

    this.emitChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.mountPromise;
    const fsPath = toFSPathOrThrow(wsPath);
    await this.idb.unlink(fsPath);

    this.emitChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.mountPromise;
    const fsPath = toFSPathOrThrow(wsPath);

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
    const fsPath = toFSPathOrThrow(wsPath);
    const stat = await this.idb.stat(fsPath);

    return {
      ctime: stat.mtimeMs,
      mtime: stat.mtimeMs,
    };
  }

  async listAllFiles(
    wsName: string,
    abortSignal: AbortSignal,
  ): Promise<string[]> {
    await this.mountPromise;

    const rawPaths: string[] = await this.idb.opendirRecursive(
      wsName,
      abortSignal,
    );
    abortSignal.throwIfAborted();

    return rawPaths
      .map((path) => WsPath.fromFSPath(path))
      .filter((path) => !!path)
      .map((path) => path.wsPath)
      .sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;

    if (!(await this.fileExists(wsPath))) {
      return undefined;
    }
    const fsPath = toFSPathOrThrow(wsPath);
    return this.idb.readFile(fsPath);
  }

  async renameFile(
    wsPath: string,
    { newWsPath }: { newWsPath: string },
  ): Promise<void> {
    await this.mountPromise;
    const oldFsPath = toFSPathOrThrow(wsPath);
    const newFsPath = toFSPathOrThrow(newWsPath);

    try {
      await this.idb.rename(oldFsPath, newFsPath);
    } catch (error) {
      if (
        error instanceof BaseFileSystemError &&
        error.code === FILE_ALREADY_EXISTS_ERROR
      ) {
        throwAppError('error::file:already-existing', 'File already exists', {
          wsPath: newWsPath,
        });
      }
      throw error;
    }

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
    const fsPath = toFSPathOrThrow(wsPath);
    await this.idb.writeFile(fsPath, file);

    this.emitChange({
      type: 'update',
      wsPath,
    });
  }
}

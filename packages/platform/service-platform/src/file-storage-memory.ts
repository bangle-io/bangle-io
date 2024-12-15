import { BaseFileSystemError, FILE_NOT_FOUND_ERROR } from '@bangle.io/baby-fs';
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

interface FileEntry {
  file: File;
  mtime: number;
  ctime: number;
}

export class FileStorageMemory
  extends BaseService2
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.Memory;
  public readonly displayName = 'Memory Storage';
  public readonly description = 'Temporarily saves data in memory';

  private fileEntries = new Map<string, FileEntry>();
  private onChange: (event: FileStorageChangeEvent) => void;

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    config: { onChange: (event: FileStorageChangeEvent) => void },
  ) {
    super(SERVICE_NAME.fileStorageMemoryService, context, dependencies);
    this.onChange = config.onChange;
  }

  async hookMount(): Promise<void> {
    this.addCleanup(() => {
      this.fileEntries.clear();
    });
  }

  private emitChange(event: FileStorageChangeEvent) {
    this.onChange(event);
  }

  private getFileEntryPath(wsPath: string) {
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
    const fileEntryPath = this.getFileEntryPath(wsPath);
    const now = Date.now();

    this.fileEntries.set(fileEntryPath, {
      file,
      mtime: now,
      ctime: now,
    });

    this.emitChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.mountPromise;
    const fileEntryPath = this.getFileEntryPath(wsPath);
    this.fileEntries.delete(fileEntryPath);

    this.emitChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.mountPromise;
    return this.fileEntries.has(this.getFileEntryPath(wsPath));
  }

  async fileStat(wsPath: string) {
    await this.mountPromise;
    const fileEntryPath = this.getFileEntryPath(wsPath);
    const entry = this.fileEntries.get(fileEntryPath);

    if (!entry) {
      throw new BaseFileSystemError({
        message: 'File not found',
        code: FILE_NOT_FOUND_ERROR,
      });
    }

    return {
      ctime: entry.ctime,
      mtime: entry.mtime,
    };
  }

  isSupported() {
    return true;
  }

  async listAllFiles(
    wsName: string,
    abortSignal: AbortSignal,
  ): Promise<string[]> {
    await this.mountPromise;

    const files = Array.from(this.fileEntries.keys())
      .filter((path) => path.startsWith(wsName))
      .map((path) => fromFsPath(path))
      .filter((r): r is string => Boolean(r));

    abortSignal.throwIfAborted();

    return files.sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;
    const entry = this.fileEntries.get(this.getFileEntryPath(wsPath));

    return entry?.file;
  }

  async renameFile(
    wsPath: string,
    { newWsPath }: { newWsPath: string },
  ): Promise<void> {
    await this.mountPromise;
    const oldPath = this.getFileEntryPath(wsPath);
    const newPath = this.getFileEntryPath(newWsPath);
    const entry = this.fileEntries.get(oldPath);

    if (entry) {
      this.fileEntries.set(newPath, entry);
      this.fileEntries.delete(oldPath);
    }

    this.emitChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const fileEntryPath = this.getFileEntryPath(wsPath);
    const entry = this.fileEntries.get(fileEntryPath);

    if (!entry) {
      throwAppError(
        'error::file-storage:file-does-not-exist',
        'Cannot write to file because it does not exist',
        {
          wsPath,
          storage: this.name,
        },
      );
    }

    this.fileEntries.set(fileEntryPath, {
      ...entry,
      file,
      mtime: Date.now(),
    });

    this.emitChange({
      type: 'update',
      wsPath,
    });
  }
}

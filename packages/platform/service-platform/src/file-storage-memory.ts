import { BaseFileSystemError, FILE_NOT_FOUND_ERROR } from '@bangle.io/baby-fs';
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
import { assertSameWorkspaceRename } from './file-storage-utils';

interface FileEntry {
  file: File;
  mtime: number;
  ctime: number;
}

export class FileStorageMemory
  extends BaseService
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.Memory;
  public readonly maxFileSizeBytes = FILE_STORAGE_MAX_FILE_SIZE_BYTES.memory;

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

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const fileEntryPath = toFSPathOrThrow(wsPath);
    if (this.fileEntries.has(fileEntryPath)) {
      throwAppError('error::file:already-existing', 'File already exists', {
        wsPath,
      });
    }

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
    const fileEntryPath = toFSPathOrThrow(wsPath);

    if (!this.fileEntries.has(fileEntryPath)) {
      throw new BaseFileSystemError({
        message: 'File not found',
        code: FILE_NOT_FOUND_ERROR,
      });
    }

    this.fileEntries.delete(fileEntryPath);

    this.emitChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.mountPromise;
    return this.fileEntries.has(toFSPathOrThrow(wsPath));
  }

  async fileStat(wsPath: string) {
    await this.mountPromise;
    const fileEntryPath = toFSPathOrThrow(wsPath);
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

  async listAllFiles(
    wsName: string,
    abortSignal: AbortSignal,
  ): Promise<string[]> {
    await this.mountPromise;

    const files = Array.from(this.fileEntries.keys()).flatMap((path) => {
      const parsedPath = WsPath.fromFSPath(path);
      return parsedPath?.wsName === wsName ? [parsedPath.wsPath] : [];
    });

    abortSignal.throwIfAborted();

    return files.sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;
    const entry = this.fileEntries.get(toFSPathOrThrow(wsPath));

    return entry?.file;
  }

  async renameFile(
    wsPath: string,
    { newWsPath }: { newWsPath: string },
  ): Promise<void> {
    await this.mountPromise;
    assertSameWorkspaceRename(wsPath, newWsPath);
    const oldPath = toFSPathOrThrow(wsPath);
    const newPath = toFSPathOrThrow(newWsPath);
    const entry = this.fileEntries.get(oldPath);

    if (!entry) {
      throw new BaseFileSystemError({
        message: 'File not found',
        code: FILE_NOT_FOUND_ERROR,
      });
    }

    if (this.fileEntries.has(newPath)) {
      throwAppError(
        'error::file:already-existing',
        'Cannot rename as a file with the same name already exists',
        {
          wsPath: newWsPath,
        },
      );
    }

    this.fileEntries.set(newPath, entry);
    this.fileEntries.delete(oldPath);

    this.emitChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const fileEntryPath = toFSPathOrThrow(wsPath);
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

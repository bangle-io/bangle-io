import { BaseFileSystemError, FILE_NOT_FOUND_ERROR } from '@bangle.io/baby-fs';
import { BaseService, throwAppError } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import type {
  BaseFileStorageProvider,
  BaseServiceCommonOptions,
  FileStorageChangeEvent,
} from '@bangle.io/types';
import { fromFsPath, toFSPath } from '@bangle.io/ws-path';

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
  public readonly displayName = 'Memory Storage';
  public readonly description = 'Temporarily saves data in memory';

  private files = new Map<string, FileEntry>();

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: undefined,
    private options: { onChange: (event: FileStorageChangeEvent) => void },
  ) {
    super({
      ...baseOptions,
      name: 'file-storage-memory',
      kind: 'platform',
      dependencies,
    });
  }

  protected async onInitialize(): Promise<void> {}

  protected async onDispose(): Promise<void> {
    this.files.clear();
  }

  private internalOnChange(event: FileStorageChangeEvent) {
    this.options.onChange(event);
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
    await this.initialize;
    const path = this.getFsPath(wsPath);
    const now = Date.now();

    this.files.set(path, {
      file,
      mtime: now,
      ctime: now,
    });

    this.internalOnChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.initialize;
    const path = this.getFsPath(wsPath);
    this.files.delete(path);

    this.internalOnChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.initialize;
    return this.files.has(this.getFsPath(wsPath));
  }

  async fileStat(wsPath: string) {
    await this.initialize;
    const path = this.getFsPath(wsPath);
    const entry = this.files.get(path);

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
    await this.initialize;

    const files = Array.from(this.files.keys())
      .filter((path) => path.startsWith(wsName))
      .map((path) => fromFsPath(path))
      .filter((r): r is string => Boolean(r));

    abortSignal.throwIfAborted();

    return files.sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.initialize;
    const entry = this.files.get(this.getFsPath(wsPath));

    return entry?.file;
  }

  async renameFile(
    wsPath: string,
    { newWsPath }: { newWsPath: string },
  ): Promise<void> {
    await this.initialize;
    const oldPath = this.getFsPath(wsPath);
    const newPath = this.getFsPath(newWsPath);
    const entry = this.files.get(oldPath);

    if (entry) {
      this.files.set(newPath, entry);
      this.files.delete(oldPath);
    }

    this.internalOnChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    await this.initialize;
    const path = this.getFsPath(wsPath);

    if (!this.files.has(path)) {
      throwAppError(
        'error::file-storage:file-does-not-exist',
        'Cannot write file as it does not exist',
        {
          wsPath,
          storage: this.name,
        },
      );
    }

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

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const entry = this.files.get(path)!;

    this.files.set(path, {
      ...entry,
      file,
      mtime: Date.now(),
    });

    this.internalOnChange({
      type: 'update',
      wsPath,
    });
  }
}

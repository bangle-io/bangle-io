import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  NativeBrowserFileSystem,
  hasPermission,
  requestNativeBrowserFSPermission,
  supportsNativeBrowserFs,
} from '@bangle.io/baby-fs';
import {
  BaseService,
  isWorkerGlobalScope,
  throwAppError,
} from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import type {
  BaseFileStorageProvider,
  BaseServiceCommonOptions,
  FileStorageChangeEvent,
} from '@bangle.io/types';
import { fromFsPath, getExtension, toFSPath } from '@bangle.io/ws-path';
import { VALID_NOTE_EXTENSIONS_SET } from '@bangle.io/ws-path';
import { getWsName } from '@bangle.io/ws-path';

export class FileStorageNativeFs
  extends BaseService<{
    getRootDirHandle: (
      wsName: string,
    ) => Promise<{ handle: FileSystemDirectoryHandle }>;
  }>
  implements BaseFileStorageProvider
{
  static async hasPermission(handle: FileSystemDirectoryHandle) {
    return hasPermission(handle);
  }

  static async requestNativeBrowserFSPermission(
    handle: FileSystemDirectoryHandle,
  ) {
    return requestNativeBrowserFSPermission(handle);
  }

  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.NativeFS;
  public readonly displayName = 'Native Storage';
  public readonly description = 'Saves data in your hard drive';
  private fsCache: Map<string, NativeBrowserFileSystem> = new Map();

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: undefined,
    private options: {
      onChange: (event: FileStorageChangeEvent) => void;
    },
  ) {
    super({
      ...baseOptions,
      name: 'file-storage-nativefs',
      kind: 'platform',
      dependencies,
      needsConfig: true,
    });
  }

  protected async onInitialize(): Promise<void> {}

  // Modified onDispose method
  protected async onDispose(): Promise<void> {
    await this.invalidateCache();
  }

  private internalOnChange(event: FileStorageChangeEvent) {
    this.options.onChange(event);
  }

  // Modified getFs method with caching
  private async getFs(wsPathOrName: string): Promise<NativeBrowserFileSystem> {
    const wsName = getWsName(wsPathOrName);
    if (!wsName) {
      throwAppError(
        'error::file-storage:file-does-not-exist',
        'Invalid workspace path',
        {
          wsPath: wsPathOrName,
          storage: this.name,
        },
      );
    }

    // Check cache first
    const cached = this.fsCache.get(wsName);
    if (cached) {
      return cached;
    }

    const { handle: rootDirHandle } =
      await this.config.getRootDirHandle(wsName);

    const fs = new NativeBrowserFileSystem({
      rootDirHandle: rootDirHandle,
      allowedFile: ({ name }) => {
        const extension = getExtension(name);
        if (!extension) {
          return false;
        }
        if (!VALID_NOTE_EXTENSIONS_SET.has(extension)) {
          return false;
        }
        return true;
      },
    });

    // Store in cache
    this.fsCache.set(wsName, fs);
    return fs;
  }

  // Add invalidateCache method
  protected async invalidateCache(): Promise<void> {
    this.fsCache.clear();
  }

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.initialize;

    const path = toFSPath(wsPath);
    const fs = await this.getFs(wsPath);

    await fs.writeFile(path, file);

    this.internalOnChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.initialize;
    const fs = await this.getFs(wsPath);
    await fs.unlink(toFSPath(wsPath));
    this.internalOnChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.initialize;
    const fs = await this.getFs(wsPath);
    const path = toFSPath(wsPath);
    try {
      await fs.stat(path);
      return true;
    } catch (error) {
      if (
        error instanceof BaseFileSystemError &&
        error.code === FILE_NOT_FOUND_ERROR
      ) {
        return false;
      }
      throw error;
    }
  }

  async fileStat(wsPath: string) {
    await this.initialize;
    const fs = await this.getFs(wsPath);
    const path = toFSPath(wsPath);
    const stat = await fs.stat(path);
    return {
      ctime: stat.mtimeMs,
      mtime: stat.mtimeMs,
    };
  }
  isSupported() {
    // TODO we donot have a great way to detect if supported in worker
    if (isWorkerGlobalScope()) {
      return true;
    }

    return supportsNativeBrowserFs();
  }

  async listAllFiles(
    wsName: string,
    abortSignal: AbortSignal,
  ): Promise<string[]> {
    await this.initialize;
    const fs = await this.getFs(wsName);
    const rawPaths = await fs.opendirRecursive(wsName);
    abortSignal.throwIfAborted();
    const files = rawPaths
      .map((r) => fromFsPath(r))
      .filter((r): r is string => Boolean(r));
    return files.sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.initialize;
    const fs = await this.getFs(wsPath);
    if (!(await this.fileExists(wsPath))) {
      return undefined;
    }
    return fs.readFile(toFSPath(wsPath));
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
    const fs = await this.getFs(wsPath);
    await fs.rename(toFSPath(wsPath), toFSPath(newWsPath));
    this.internalOnChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    await this.initialize;
    const fs = await this.getFs(wsPath);
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
    await fs.writeFile(toFSPath(wsPath), file);
    this.internalOnChange({
      type: 'update',
      wsPath,
    });
  }
}

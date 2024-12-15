import {
  BaseFileSystemError,
  FILE_NOT_FOUND_ERROR,
  NativeBrowserFileSystem,
  hasPermission,
  requestNativeBrowserFSPermission,
  supportsNativeBrowserFs,
} from '@bangle.io/baby-fs';
import {
  BaseService2,
  type BaseServiceContext,
  assertIsDefined,
  isWorkerGlobalScope,
  throwAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME, WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import type {
  BaseFileStorageProvider,
  FileStorageChangeEvent,
} from '@bangle.io/types';
import {
  fromFsPath,
  getExtension,
  getWsName,
  toFSPath,
} from '@bangle.io/ws-path';
import { VALID_NOTE_EXTENSIONS_SET } from '@bangle.io/ws-path';

type Config = {
  onChange: (event: FileStorageChangeEvent) => void;
};

export class FileStorageNativeFs
  extends BaseService2
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.NativeFS;
  public readonly displayName = 'Native Storage';
  public readonly description = 'Saves data on your hard drive';

  private fsCache: Map<string, NativeBrowserFileSystem> = new Map();
  getRootDirHandle!: (
    wsName: string,
  ) => Promise<{ handle: FileSystemDirectoryHandle }>;

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: Config,
  ) {
    super(SERVICE_NAME.fileStorageNativeFsService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    assertIsDefined(this.getRootDirHandle, 'getRootDirHandle');
    this.addCleanup(() => {
      this.invalidateCache();
    });
  }

  static async hasPermission(handle: FileSystemDirectoryHandle) {
    return hasPermission(handle);
  }

  static async requestNativeBrowserFSPermission(
    handle: FileSystemDirectoryHandle,
  ) {
    return requestNativeBrowserFSPermission(handle);
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

  private emitChange(event: FileStorageChangeEvent) {
    this.config.onChange(event);
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

    const cachedFs = this.fsCache.get(wsName);
    if (cachedFs) {
      return cachedFs;
    }

    const { handle: rootDirHandle } = await this.getRootDirHandle(wsName);

    const fs = new NativeBrowserFileSystem({
      rootDirHandle: rootDirHandle,
      allowedFile: ({ name }) => {
        const extension = getExtension(name);
        if (!extension) {
          return false;
        }
        return VALID_NOTE_EXTENSIONS_SET.has(extension);
      },
    });

    this.fsCache.set(wsName, fs);
    return fs;
  }

  private async invalidateCache(): Promise<void> {
    this.fsCache.clear();
  }

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const fsPath = this.getFsPath(wsPath);
    const fs = await this.getFs(wsPath);
    await fs.writeFile(fsPath, file);

    this.emitChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.mountPromise;
    const fs = await this.getFs(wsPath);
    await fs.unlink(this.getFsPath(wsPath));
    this.emitChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.mountPromise;
    const fs = await this.getFs(wsPath);
    const fsPath = this.getFsPath(wsPath);
    try {
      await fs.stat(fsPath);
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
    await this.mountPromise;
    const fs = await this.getFs(wsPath);
    const fsPath = this.getFsPath(wsPath);
    const stat = await fs.stat(fsPath);
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
    await this.mountPromise;
    const fs = await this.getFs(wsName);
    const rawPaths = await fs.opendirRecursive(wsName);
    abortSignal.throwIfAborted();
    return rawPaths
      .map((r) => fromFsPath(r))
      .filter((r): r is string => Boolean(r))
      .sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;
    const fs = await this.getFs(wsPath);
    if (!(await this.fileExists(wsPath))) {
      return undefined;
    }
    return fs.readFile(this.getFsPath(wsPath));
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
    const fs = await this.getFs(wsPath);
    await fs.rename(this.getFsPath(wsPath), this.getFsPath(newWsPath));
    this.emitChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const fs = await this.getFs(wsPath);
    if (!(await this.fileExists(wsPath))) {
      throwAppError(
        'error::file-storage:file-does-not-exist',
        'Cannot write to file because it does not exist',
        {
          wsPath,
          storage: this.name,
        },
      );
    }
    await fs.writeFile(this.getFsPath(wsPath), file);
    this.emitChange({
      type: 'update',
      wsPath,
    });
  }
}

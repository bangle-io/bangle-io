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
import { WsPath } from '@bangle.io/ws-path';

type Config = {
  onChange: (event: FileStorageChangeEvent) => void;
};

export class FileStorageNativeFs
  extends BaseService
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
    const path = WsPath.fromString(wsPath).toFSPath();
    if (!path) {
      throwAppError(
        'error::ws-path:invalid-ws-path',
        'Invalid workspace path',
        {
          invalidPath: wsPath,
        },
      );
    }
    return path;
  }

  private emitChange(event: FileStorageChangeEvent) {
    this.config.onChange(event);
  }

  // Modified getFs method with caching
  private async getFs(
    input:
      | { wsPath: string; wsName?: undefined }
      | { wsName: string; wsPath?: undefined },
  ): Promise<NativeBrowserFileSystem> {
    let wsName: string | undefined;

    if (input.wsPath) {
      wsName = WsPath.safeParse(input.wsPath).data?.wsName;
    } else if (input.wsName) {
      wsName = WsPath.validation.validateWsName(input.wsName)?.ok
        ? input.wsName
        : undefined;
    }

    if (!wsName) {
      throwAppError(
        'error::file-storage:file-does-not-exist',
        'Invalid workspace path',
        {
          wsPath: input.wsName || input.wsPath || '<unknown>',
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
      allowedFile: () => {
        // TODO implement ignoring weird files
        return true;
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
    const fs = await this.getFs({ wsPath });
    await fs.writeFile(fsPath, file);

    this.emitChange({
      type: 'create',
      wsPath,
    });
  }

  async deleteFile(wsPath: string): Promise<void> {
    await this.mountPromise;
    const fs = await this.getFs({ wsPath });
    await fs.unlink(this.getFsPath(wsPath));
    this.emitChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.mountPromise;
    const fs = await this.getFs({ wsPath });
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
    const fs = await this.getFs({ wsPath });
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
    const fs = await this.getFs({ wsName });
    const rawPaths = await fs.opendirRecursive(wsName);
    abortSignal.throwIfAborted();
    return rawPaths
      .map((r) => WsPath.fromFSPath(r))
      .filter((r) => !!r)
      .map((r) => r.wsPath)
      .sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;
    const fs = await this.getFs({ wsPath });
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
    const fs = await this.getFs({ wsPath });
    await fs.rename(this.getFsPath(wsPath), this.getFsPath(newWsPath));
    this.emitChange({
      type: 'rename',
      oldWsPath: wsPath,
      newWsPath,
    });
  }

  async writeFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const fs = await this.getFs({ wsPath });
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

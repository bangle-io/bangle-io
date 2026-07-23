import {
  assertIsDefined,
  BaseService,
  type BaseServiceContext,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  FILE_STORAGE_MAX_FILE_SIZE_BYTES,
  SERVICE_NAME,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
import {
  hasPermission,
  isNativeFsError,
  NATIVE_FS_ERROR_CODE,
  NativeFs,
  type NativeFsChange,
  supportsFileSystemObserver,
} from '@bangle.io/native-fs';
import type {
  BaseFileStorageProvider,
  FileStorageChangeEvent,
  FileStorageExternalChangeEvent,
} from '@bangle.io/types';
import {
  isVisibleWorkspaceDirectoryName,
  isVisibleWorkspaceFilePath,
  WsPath,
} from '@bangle.io/ws-path';
import { assertSameWorkspaceRename } from './file-storage-utils';
import type { PageReturnInfo } from './router/page-return';

type Config = {
  getRootDirHandle: (
    wsName: string,
  ) => Promise<{ handle: FileSystemDirectoryHandle }>;
  onChange: (event: FileStorageChangeEvent) => void;
  /**
   * External watcher events. Self-write records intentionally flow through;
   * downstream content comparison coalesces echoes without hiding a real
   * overwrite that happened just after a local save.
   */
  onExternalChange?: (event: FileStorageExternalChangeEvent) => void;
  /**
   * Page-return fallback for unsupported, failed, or potentially starved
   * observers.
   */
  subscribePageReturn?: (
    listener: (info: PageReturnInfo) => void,
    signal: AbortSignal,
  ) => void;
};

/** How the watcher should treat a path from an observer record. */
type WatchPathClass =
  | { kind: 'file'; wsPath: string }
  | { kind: 'ignored' }
  | { kind: 'coarse' };

type FsCacheEntry = {
  fs: NativeFs;
  /** `starting` deduplicates setup; only `armed` may skip revalidation. */
  watchState: 'idle' | 'starting' | 'armed';
};

export class FileStorageNativeFs
  extends BaseService
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.NativeFS;
  public readonly maxFileSizeBytes = FILE_STORAGE_MAX_FILE_SIZE_BYTES.nativeFs;

  private fsCache: Map<string, FsCacheEntry> = new Map();
  private fsLoads: Map<string, Promise<FsCacheEntry>> = new Map();

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: Config,
  ) {
    super(SERVICE_NAME.fileStorageNativeFsService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    assertIsDefined(this.config.getRootDirHandle, 'getRootDirHandle');
    if (this.config.onExternalChange) {
      this.config.subscribePageReturn?.(
        (info) => this.revalidateOnPageReturn(info),
        this.abortSignal,
      );
    }
    this.addCleanup(() => {
      this.fsCache.clear();
      this.fsLoads.clear();
    });
  }

  static async hasPermission(handle: FileSystemDirectoryHandle) {
    return hasPermission(handle, 'readwrite');
  }

  private emitChange(event: FileStorageChangeEvent) {
    this.config.onChange(event);
  }

  // Caches the NativeFs instance per workspace name so repeated calls avoid
  // re-requesting the root directory handle.
  private async getFs(
    input:
      | { wsPath: string; wsName?: undefined }
      | { wsName: string; wsPath?: undefined },
  ): Promise<NativeFs> {
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

    const cached = this.fsCache.get(wsName);
    if (cached) {
      return cached.fs;
    }
    let load = this.fsLoads.get(wsName);
    if (!load) {
      load = this.config.getRootDirHandle(wsName).then(({ handle }) => {
        // The lock scope is the workspace name (not the folder basename) so
        // cross-tab write serialization stays keyed to the workspace identity.
        const fs = new NativeFs({ rootHandle: handle, lockScope: wsName });
        const entry: FsCacheEntry = { fs, watchState: 'idle' };
        this.fsCache.set(wsName, entry);
        this.startWatching(wsName, entry);
        return entry;
      });
      this.fsLoads.set(wsName, load);
    }
    try {
      return (await load).fs;
    } finally {
      if (this.fsLoads.get(wsName) === load) {
        this.fsLoads.delete(wsName);
      }
    }
  }

  // ---- external change watching ----

  private startWatching(wsName: string, entry: FsCacheEntry): void {
    if (
      !this.config.onExternalChange ||
      entry.watchState !== 'idle' ||
      // Unsupported browsers use page-return revalidation.
      !supportsFileSystemObserver()
    ) {
      return;
    }
    entry.watchState = 'starting';

    // Watching is best-effort; page return retries a failed start.
    void entry.fs
      .watch((changes) => this.handleWatchChanges(wsName, changes), {
        signal: this.abortSignal,
      })
      .then((armed) => {
        entry.watchState = armed ? 'armed' : 'idle';
      })
      .catch((error) => {
        entry.watchState = 'idle';
        this.logger.warn(
          `Unable to watch native FS workspace "${wsName}" for external changes`,
          error,
        );
      });
  }

  /**
   * Re-arms unhealthy watchers. Hidden returns always refresh because the
   * browser may have starved observers; plain refocus refreshes only when a
   * watcher is unavailable. One app-wide event covers all workspaces.
   */
  private revalidateOnPageReturn(info: PageReturnInfo): void {
    const onExternalChange = this.config.onExternalChange;
    if (!onExternalChange || this.fsCache.size === 0) {
      return;
    }
    let shouldRefresh = false;
    for (const [wsName, entry] of this.fsCache) {
      const wasArmed = entry.watchState === 'armed';
      this.startWatching(wsName, entry);
      if (info.returnedFromHidden || !wasArmed) {
        shouldRefresh = true;
      }
    }
    if (shouldRefresh) {
      onExternalChange({ type: 'refresh' });
    }
  }

  /**
   * Classifies a record as a targeted visible file, an ignored hidden path,
   * or a coarse refresh when path shape is ambiguous.
   */
  private classifyWatchPath(
    wsName: string,
    relativePath: string,
  ): WatchPathClass {
    const result = WsPath.safeFromParts(wsName, relativePath);
    const wsPath = result.ok && result.data ? result.data.wsPath : undefined;
    if (wsPath === undefined) {
      return { kind: 'coarse' };
    }
    if (!WsPath.safeParseFile(wsPath).data) {
      return { kind: 'coarse' };
    }
    if (!isVisibleWorkspaceFilePath(wsPath)) {
      return { kind: 'ignored' };
    }
    return { kind: 'file', wsPath };
  }

  private handleWatchChanges(wsName: string, changes: NativeFsChange[]): void {
    const onExternalChange = this.config.onExternalChange;
    if (!onExternalChange) {
      return;
    }

    // Coalesce duplicate records; a coarse refresh subsumes targeted events.
    let needsRefresh = false;
    const specificEvents = new Map<string, FileStorageExternalChangeEvent>();
    for (const change of changes) {
      // Re-arm a broken observer on the next page return.
      if (change.type === 'errored') {
        const entry = this.fsCache.get(wsName);
        if (entry) {
          entry.watchState = 'idle';
        }
        needsRefresh = true;
        continue;
      }
      if (needsRefresh) {
        continue;
      }
      if (change.type === 'unknown' || change.kind === 'directory') {
        needsRefresh = true;
        continue;
      }

      if (change.type === 'moved') {
        if (change.movedFromPath === undefined) {
          // The origin is required to determine visibility.
          needsRefresh = true;
          continue;
        }
        const from = this.classifyWatchPath(wsName, change.movedFromPath);
        const to = this.classifyWatchPath(wsName, change.path);
        if (from.kind === 'coarse' || to.kind === 'coarse') {
          needsRefresh = true;
        } else if (from.kind === 'file' && to.kind === 'file') {
          // Visible moves may be renames or atomic replacements.
          needsRefresh = true;
        } else if (to.kind === 'file') {
          // Atomic write from an invisible temporary path.
          specificEvents.set(`create:${to.wsPath}`, {
            type: 'create',
            wsPath: to.wsPath,
          });
        } else if (from.kind === 'file') {
          // A visible file moved out of the app's listing.
          specificEvents.set(`delete:${from.wsPath}`, {
            type: 'delete',
            wsPath: from.wsPath,
          });
        }
        continue;
      }

      const classified = this.classifyWatchPath(wsName, change.path);
      if (classified.kind === 'coarse') {
        needsRefresh = true;
        continue;
      }
      if (classified.kind === 'ignored') {
        continue;
      }
      const wsPath = classified.wsPath;
      switch (change.type) {
        case 'appeared': {
          specificEvents.set(`create:${wsPath}`, { type: 'create', wsPath });
          break;
        }
        case 'modified': {
          specificEvents.set(`update:${wsPath}`, { type: 'update', wsPath });
          break;
        }
        case 'disappeared': {
          specificEvents.set(`delete:${wsPath}`, { type: 'delete', wsPath });
          break;
        }
        default: {
          const _exhaustiveCheck: never = change.type;
        }
      }
    }

    if (needsRefresh) {
      onExternalChange({ type: 'refresh', wsName });
      return;
    }
    for (const event of specificEvents.values()) {
      onExternalChange(event);
    }
  }

  /**
   * Converts a wsPath to the path relative to the workspace root directory.
   * The on-disk layout never includes the workspace name: `notes:a/b.md`
   * lives at `a/b.md` under the picked directory.
   */
  private toRelativePath(wsPath: string): string {
    return WsPath.fromString(wsPath).path;
  }

  async createFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    const fs = await this.getFs({ wsPath });
    try {
      await fs.createFile(this.toRelativePath(wsPath), file);
    } catch (error) {
      if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.alreadyExists)) {
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
    const fs = await this.getFs({ wsPath });
    try {
      await fs.deleteFile(this.toRelativePath(wsPath));
    } catch (error) {
      if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)) {
        throwAppError(
          'error::file-storage:file-does-not-exist',
          'Cannot delete file because it does not exist',
          {
            wsPath,
            storage: this.name,
          },
        );
      }
      throw error;
    }
    this.emitChange({
      type: 'delete',
      wsPath,
    });
  }

  async fileExists(wsPath: string): Promise<boolean> {
    await this.mountPromise;
    const fs = await this.getFs({ wsPath });
    return fs.exists(this.toRelativePath(wsPath));
  }

  async fileStat(wsPath: string) {
    await this.mountPromise;
    const fs = await this.getFs({ wsPath });
    try {
      const stat = await fs.stat(this.toRelativePath(wsPath));
      return {
        ctime: stat.mtimeMs,
        mtime: stat.mtimeMs,
      };
    } catch (error) {
      if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)) {
        throwAppError(
          'error::file-storage:file-does-not-exist',
          'File does not exist',
          {
            wsPath,
            storage: this.name,
          },
        );
      }
      throw error;
    }
  }

  async listAllFiles(
    wsName: string,
    abortSignal: AbortSignal,
  ): Promise<string[]> {
    await this.mountPromise;
    const fs = await this.getFs({ wsName });

    let relativePaths: string[];
    try {
      relativePaths = await fs.listFiles({
        signal: abortSignal,
        includeDirectory: isVisibleWorkspaceDirectoryName,
      });
    } catch (error) {
      if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)) {
        throwAppError(
          'error::file-storage:file-does-not-exist',
          'Native workspace path was not found',
          {
            wsPath: `${wsName}:`,
            storage: this.name,
          },
        );
      }
      throw error;
    }
    abortSignal.throwIfAborted();
    return relativePaths
      .map((relativePath) => WsPath.safeFromParts(wsName, relativePath))
      .flatMap((result) =>
        result.ok && result.data ? [result.data.wsPath] : [],
      )
      .sort((a, b) => a.localeCompare(b));
  }

  async readFile(wsPath: string): Promise<File | undefined> {
    await this.mountPromise;
    const fs = await this.getFs({ wsPath });
    try {
      return await fs.readFile(this.toRelativePath(wsPath));
    } catch (error) {
      if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)) {
        return undefined;
      }
      throw error;
    }
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
    assertSameWorkspaceRename(wsPath, newWsPath);
    const fs = await this.getFs({ wsPath });
    try {
      await fs.moveFile(
        this.toRelativePath(wsPath),
        this.toRelativePath(newWsPath),
      );
    } catch (error) {
      if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.alreadyExists)) {
        throwAppError(
          'error::file:already-existing',
          'Cannot rename as a file with the same name already exists',
          {
            wsPath: newWsPath,
          },
        );
      }
      if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)) {
        throwAppError(
          'error::file-storage:file-does-not-exist',
          'Cannot rename file because it does not exist',
          {
            wsPath,
            storage: this.name,
          },
        );
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
    const fs = await this.getFs({ wsPath });
    try {
      await fs.writeFile(this.toRelativePath(wsPath), file, { create: false });
    } catch (error) {
      if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)) {
        throwAppError(
          'error::file-storage:file-does-not-exist',
          'Cannot write to file because it does not exist',
          {
            wsPath,
            storage: this.name,
          },
        );
      }
      throw error;
    }
    this.emitChange({
      type: 'update',
      wsPath,
    });
  }
}

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

type Config = {
  getRootDirHandle: (
    wsName: string,
  ) => Promise<{ handle: FileSystemDirectoryHandle }>;
  onChange: (event: FileStorageChangeEvent) => void;
  /**
   * Invoked for changes made to workspace files by something other than this
   * app instance (sync tools, other editors). Providing it turns on
   * FileSystemObserver watching (Chrome 133+) per opened workspace, with a
   * throttled focus/visibility re-list fallback when the observer API is
   * unavailable.
   */
  onExternalChange?: (event: FileStorageExternalChangeEvent) => void;
};

/**
 * How long after one of our own mutations a watcher record for the same
 * wsPath is treated as the echo of that mutation and dropped. Covers the
 * observer's callback latency plus slack for slow disk writes.
 */
const SELF_WRITE_ECHO_WINDOW_MS = 5_000;

/**
 * Minimum spacing between coarse refreshes triggered by window focus /
 * visibility when the FileSystemObserver API is unavailable.
 */
const FOCUS_REVALIDATE_MIN_INTERVAL_MS = 15_000;

export class FileStorageNativeFs
  extends BaseService
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.NativeFS;
  public readonly maxFileSizeBytes = FILE_STORAGE_MAX_FILE_SIZE_BYTES.nativeFs;

  private fsCache: Map<string, NativeFs> = new Map();
  private watchedWorkspaces = new Set<string>();
  private recentSelfWrites = new Map<string, number>();

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: Config,
  ) {
    super(SERVICE_NAME.fileStorageNativeFsService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    assertIsDefined(this.config.getRootDirHandle, 'getRootDirHandle');
    this.addCleanup(() => {
      this.fsCache.clear();
      this.watchedWorkspaces.clear();
      this.recentSelfWrites.clear();
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

    const cachedFs = this.fsCache.get(wsName);
    if (cachedFs) {
      return cachedFs;
    }

    const { handle: rootDirHandle } =
      await this.config.getRootDirHandle(wsName);

    // The lock scope is the workspace name (not the folder basename) so
    // cross-tab write serialization stays keyed to the workspace identity.
    const fs = new NativeFs({
      rootHandle: rootDirHandle,
      lockScope: wsName,
    });

    this.fsCache.set(wsName, fs);
    this.startWatching(wsName, fs);
    return fs;
  }

  // ---- external change watching ----

  private startWatching(wsName: string, fs: NativeFs): void {
    if (!this.config.onExternalChange || this.watchedWorkspaces.has(wsName)) {
      return;
    }
    this.watchedWorkspaces.add(wsName);

    // Watching is best-effort: a failure to observe must never break file
    // operations, so errors are logged rather than propagated.
    void fs
      .watch((changes) => this.handleWatchChanges(wsName, changes), {
        signal: this.abortSignal,
      })
      .then((supported) => {
        if (!supported) {
          this.startFocusRevalidation(wsName);
        }
      })
      .catch((error) => {
        this.logger.warn(
          `Unable to watch native FS workspace "${wsName}" for external changes`,
          error,
        );
      });
  }

  /**
   * Coarse fallback when `FileSystemObserver` is unavailable: emit a
   * throttled workspace refresh whenever the window regains focus or becomes
   * visible, since that is when externally synced changes become relevant.
   */
  private startFocusRevalidation(wsName: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    let lastRefresh = 0;
    const trigger = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      const now = Date.now();
      if (now - lastRefresh < FOCUS_REVALIDATE_MIN_INTERVAL_MS) {
        return;
      }
      lastRefresh = now;
      this.config.onExternalChange?.({ type: 'refresh', wsName });
    };
    window.addEventListener('focus', trigger, { signal: this.abortSignal });
    document.addEventListener('visibilitychange', trigger, {
      signal: this.abortSignal,
    });
  }

  private noteSelfWrite(...wsPaths: string[]): void {
    const now = Date.now();
    for (const [path, at] of this.recentSelfWrites) {
      if (now - at > SELF_WRITE_ECHO_WINDOW_MS) {
        this.recentSelfWrites.delete(path);
      }
    }
    for (const wsPath of wsPaths) {
      this.recentSelfWrites.set(wsPath, now);
    }
  }

  private isRecentSelfWrite(wsPath: string): boolean {
    const at = this.recentSelfWrites.get(wsPath);
    return at !== undefined && Date.now() - at <= SELF_WRITE_ECHO_WINDOW_MS;
  }

  private handleWatchChanges(wsName: string, changes: NativeFsChange[]): void {
    const onExternalChange = this.config.onExternalChange;
    if (!onExternalChange) {
      return;
    }

    let refreshEmitted = false;
    const emitRefresh = () => {
      if (!refreshEmitted) {
        refreshEmitted = true;
        onExternalChange({ type: 'refresh', wsName });
      }
    };
    const toVisibleWsPath = (relativePath: string): string | undefined => {
      const result = WsPath.safeFromParts(wsName, relativePath);
      const wsPath = result.ok && result.data ? result.data.wsPath : undefined;
      if (wsPath === undefined) {
        return undefined;
      }
      return isVisibleWorkspaceFilePath(wsPath) ? wsPath : undefined;
    };

    for (const change of changes) {
      // Directory-level records and records the observer could not classify
      // only tell us "something under this workspace changed" — fall back to
      // one coarse refresh instead of guessing per-file events.
      if (
        change.type === 'unknown' ||
        change.type === 'errored' ||
        change.kind === 'directory'
      ) {
        emitRefresh();
        continue;
      }

      if (change.type === 'moved') {
        const newWsPath = toVisibleWsPath(change.path);
        const oldWsPath =
          change.movedFromPath === undefined
            ? undefined
            : toVisibleWsPath(change.movedFromPath);
        if (!newWsPath || !oldWsPath) {
          emitRefresh();
          continue;
        }
        if (
          this.isRecentSelfWrite(newWsPath) ||
          this.isRecentSelfWrite(oldWsPath)
        ) {
          continue;
        }
        onExternalChange({ type: 'rename', oldWsPath, newWsPath });
        continue;
      }

      const wsPath = toVisibleWsPath(change.path);
      if (wsPath === undefined) {
        // Hidden/system/unparseable paths (sync temp files, dotfiles) are
        // invisible to the app; ignore them entirely.
        continue;
      }
      if (this.isRecentSelfWrite(wsPath)) {
        continue;
      }
      switch (change.type) {
        case 'appeared': {
          onExternalChange({ type: 'create', wsPath });
          break;
        }
        case 'modified': {
          onExternalChange({ type: 'update', wsPath });
          break;
        }
        case 'disappeared': {
          onExternalChange({ type: 'delete', wsPath });
          break;
        }
        default: {
          const _exhaustiveCheck: never = change.type;
        }
      }
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
    this.noteSelfWrite(wsPath);
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
    this.noteSelfWrite(wsPath);
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
    this.noteSelfWrite(wsPath, newWsPath);
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
    this.noteSelfWrite(wsPath);
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

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
   * FileSystemObserver watching (Chrome 133+) per opened workspace, plus the
   * page-return revalidation below when `subscribePageReturn` is supplied.
   *
   * Records caused by the app's own writes are NOT filtered here: a
   * path+time ledger cannot distinguish an echo from a genuine external
   * overwrite of the same file moments after a local save. Downstream
   * consumers coalesce echoes by comparing content, which is cheap and
   * cannot drop a real edit.
   */
  onExternalChange?: (event: FileStorageExternalChangeEvent) => void;
  /**
   * Subscribes `listener` to "the user returned to the page" transitions
   * (tab became visible again, window regained focus). The composition root
   * wires this to the platform router's page-lifecycle stream (see
   * `onPageReturn` in this package), keeping the visibility source swappable
   * and out of this service.
   *
   * On each return the service re-emits a throttled coarse refresh for every
   * opened workspace and re-arms watchers that died — OS file watchers are
   * best-effort (frozen tabs, permission loss, network drives), so returning
   * to the page is the natural moment to reconcile.
   */
  subscribePageReturn?: (listener: () => void, signal: AbortSignal) => void;
};

/**
 * Minimum spacing between coarse refreshes triggered by returning to the
 * page. A refresh re-lists the workspace and revalidates open notes, so it
 * must not fire on every alt-tab; anything the observer already reported has
 * flowed through the fine-grained path regardless.
 */
const PAGE_RETURN_REVALIDATE_MIN_INTERVAL_MS = 15_000;

export class FileStorageNativeFs
  extends BaseService
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.NativeFS;
  public readonly maxFileSizeBytes = FILE_STORAGE_MAX_FILE_SIZE_BYTES.nativeFs;

  private fsCache: Map<string, NativeFs> = new Map();
  private watchedWorkspaces = new Set<string>();
  private lastPageReturnRevalidation = 0;

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
        () => this.revalidateOnPageReturn(),
        this.abortSignal,
      );
    }
    this.addCleanup(() => {
      this.fsCache.clear();
      this.watchedWorkspaces.clear();
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
    // operations, so errors are logged rather than propagated. A failed
    // start leaves the workspace unmarked so the next page return retries.
    void fs
      .watch((changes) => this.handleWatchChanges(wsName, changes), {
        signal: this.abortSignal,
      })
      .catch((error) => {
        this.watchedWorkspaces.delete(wsName);
        this.logger.warn(
          `Unable to watch native FS workspace "${wsName}" for external changes`,
          error,
        );
      });
  }

  /**
   * The user came back to the page: emit a throttled coarse refresh for
   * every opened workspace and retry watchers that failed or died. This is
   * the safety net for everything the observer cannot promise — events
   * missed while the tab was frozen, watchers killed by permission loss,
   * filesystems where OS watching is unreliable — and the only refresh
   * mechanism at all when `FileSystemObserver` is unsupported.
   */
  private revalidateOnPageReturn(): void {
    const onExternalChange = this.config.onExternalChange;
    if (!onExternalChange || this.fsCache.size === 0) {
      return;
    }
    const now = Date.now();
    if (
      now - this.lastPageReturnRevalidation <
      PAGE_RETURN_REVALIDATE_MIN_INTERVAL_MS
    ) {
      return;
    }
    this.lastPageReturnRevalidation = now;
    for (const [wsName, fs] of this.fsCache) {
      this.startWatching(wsName, fs);
      onExternalChange({ type: 'refresh', wsName });
    }
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
      // An `errored` record means observation broke (permission loss, the
      // watched directory disappeared). Un-mark the workspace so the next
      // page return re-arms the watcher, and refresh what we may have missed.
      if (change.type === 'errored') {
        this.watchedWorkspaces.delete(wsName);
        emitRefresh();
        continue;
      }
      // Directory-level records and records the observer could not classify
      // only tell us "something under this workspace changed" — fall back to
      // one coarse refresh instead of guessing per-file events.
      if (change.type === 'unknown' || change.kind === 'directory') {
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
        onExternalChange({ type: 'rename', oldWsPath, newWsPath });
        continue;
      }

      const wsPath = toVisibleWsPath(change.path);
      if (wsPath === undefined) {
        // Hidden/system/unparseable paths (sync temp files, dotfiles) are
        // invisible to the app; ignore them entirely.
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

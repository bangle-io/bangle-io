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
   * `onPageReturn` in this package, which also collapses one return's
   * transition burst into a single notification), keeping the visibility
   * source swappable and out of this service.
   *
   * On each return the service re-arms watchers that died and re-emits a
   * coarse refresh where the watcher may have missed something — OS file
   * watchers are best-effort (frozen tabs, permission loss, network drives),
   * so returning to the page is the natural moment to reconcile.
   */
  subscribePageReturn?: (
    listener: (info: PageReturnInfo) => void,
    signal: AbortSignal,
  ) => void;
};

/**
 * Transient-file suffixes suppressed from WATCHER events only: other
 * software's scratch files churn constantly next to real content and would
 * otherwise spam per-path refreshes. Unlike the shared workspace file policy
 * (which hides `.crswap` everywhere), these stay visible in listings — a
 * pre-existing `export.tmp` can be a legitimate user file; only its change
 * noise is unwanted.
 */
const TRANSIENT_WATCH_SUFFIXES = ['.tmp', '.swp'];

/** How the watcher should treat a path from an observer record. */
type WatchPathClass =
  | { kind: 'file'; wsPath: string }
  | { kind: 'ignored' }
  | { kind: 'coarse' };

type FsCacheEntry = {
  fs: NativeFs;
  /**
   * Whether a watch is (believed to be) armed for this workspace. Set
   * optimistically when a watch starts; cleared when starting fails or the
   * observer reports an `errored` record, so the next page return re-arms.
   */
  watching: boolean;
};

export class FileStorageNativeFs
  extends BaseService
  implements BaseFileStorageProvider
{
  public readonly workspaceType = WORKSPACE_STORAGE_TYPE.NativeFS;
  public readonly maxFileSizeBytes = FILE_STORAGE_MAX_FILE_SIZE_BYTES.nativeFs;

  private fsCache: Map<string, FsCacheEntry> = new Map();

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

    const { handle: rootDirHandle } =
      await this.config.getRootDirHandle(wsName);

    // The lock scope is the workspace name (not the folder basename) so
    // cross-tab write serialization stays keyed to the workspace identity.
    const fs = new NativeFs({
      rootHandle: rootDirHandle,
      lockScope: wsName,
    });

    const entry: FsCacheEntry = { fs, watching: false };
    this.fsCache.set(wsName, entry);
    this.startWatching(wsName, entry);
    return fs;
  }

  // ---- external change watching ----

  private startWatching(wsName: string, entry: FsCacheEntry): void {
    if (
      !this.config.onExternalChange ||
      entry.watching ||
      // Without the observer API, watching can never arm; leaving the entry
      // unmarked keeps page-return revalidation as the refresh path (and
      // avoids arming optimistically only to fail asynchronously each time).
      !supportsFileSystemObserver()
    ) {
      return;
    }
    entry.watching = true;

    // Watching is best-effort: a failure to observe must never break file
    // operations, so errors are logged rather than propagated. A failed
    // start leaves the workspace unmarked so the next page return retries.
    void entry.fs
      .watch((changes) => this.handleWatchChanges(wsName, changes), {
        signal: this.abortSignal,
      })
      .catch((error) => {
        entry.watching = false;
        this.logger.warn(
          `Unable to watch native FS workspace "${wsName}" for external changes`,
          error,
        );
      });
  }

  /**
   * The user came back to the page: retry watchers that failed or died, and
   * emit a coarse refresh where the watcher may have missed changes. This is
   * the safety net for everything the observer cannot promise — events
   * missed while the tab was frozen, watchers killed by permission loss,
   * filesystems where OS watching is unreliable — and the only refresh
   * mechanism at all when `FileSystemObserver` is unsupported.
   *
   * A return from a hidden/frozen tab refreshes every opened workspace: the
   * browser may have starved the observer while the tab was away. A mere
   * window refocus (the page stayed visible throughout) misses nothing while
   * a watcher is armed, so only workspaces without a live watcher — observer
   * unsupported, or the watch died — are refreshed; anything else would
   * re-list every workspace and re-read every open note on each alt-tab.
   */
  private revalidateOnPageReturn(info: PageReturnInfo): void {
    const onExternalChange = this.config.onExternalChange;
    if (!onExternalChange || this.fsCache.size === 0) {
      return;
    }
    for (const [wsName, entry] of this.fsCache) {
      const wasWatching = entry.watching;
      this.startWatching(wsName, entry);
      if (info.returnedFromHidden || !wasWatching) {
        onExternalChange({ type: 'refresh', wsName });
      }
    }
  }

  /**
   * How the watcher should treat a record's path:
   *
   * - `file`: a visible workspace file — emit a targeted per-path event.
   * - `ignored`: invisible to the app (dotfiles, ignored directories,
   *   `.crswap`, transient watch suffixes) — drop the record entirely.
   * - `coarse`: directory-shaped or unparseable — the record cannot be
   *   mapped to per-path events; only a workspace re-list reconciles it.
   *   Deleted entries carry no handle (`kind` is unknowable for
   *   `disappeared` records), so path shape is the only directory signal
   *   left. A dotted directory name is indistinguishable from a file here;
   *   the resulting per-path event is wrong but harmless — the counter bump
   *   still re-lists the tree.
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
    const lowerPath = relativePath.toLowerCase();
    if (TRANSIENT_WATCH_SUFFIXES.some((suffix) => lowerPath.endsWith(suffix))) {
      return { kind: 'ignored' };
    }
    return { kind: 'file', wsPath };
  }

  private handleWatchChanges(wsName: string, changes: NativeFsChange[]): void {
    const onExternalChange = this.config.onExternalChange;
    if (!onExternalChange) {
      return;
    }

    // One observer callback can deliver a burst (a sync tool touching many
    // files at once), so the batch is coalesced before anything is emitted:
    // identical records collapse to one event, and once any record demands a
    // coarse refresh the refresh alone is emitted — it re-lists the workspace
    // and revalidates its open notes, subsuming every per-path event in the
    // same batch.
    let needsRefresh = false;
    const specificEvents = new Map<string, FileStorageExternalChangeEvent>();
    for (const change of changes) {
      // An `errored` record means observation broke (permission loss, the
      // watched directory disappeared). Un-mark the workspace so the next
      // page return re-arms the watcher, and refresh what we may have missed.
      if (change.type === 'errored') {
        const entry = this.fsCache.get(wsName);
        if (entry) {
          entry.watching = false;
        }
        needsRefresh = true;
        continue;
      }
      if (needsRefresh) {
        // The coarse refresh subsumes every per-path event in this batch;
        // only further `errored` records (handled above) still matter.
        continue;
      }
      // Directory-level records and records the observer could not classify
      // only tell us "something under this workspace changed" — fall back to
      // one coarse refresh instead of guessing per-file events.
      if (change.type === 'unknown' || change.kind === 'directory') {
        needsRefresh = true;
        continue;
      }

      if (change.type === 'moved') {
        if (change.movedFromPath === undefined) {
          // Origin unknown (platform watchers cannot always pair renames):
          // a visible file may have been renamed away, and only a re-list
          // can tell.
          needsRefresh = true;
          continue;
        }
        const from = this.classifyWatchPath(wsName, change.movedFromPath);
        const to = this.classifyWatchPath(wsName, change.path);
        if (from.kind === 'coarse' || to.kind === 'coarse') {
          needsRefresh = true;
        } else if (from.kind === 'file' && to.kind === 'file') {
          specificEvents.set(`rename:${from.wsPath}->${to.wsPath}`, {
            type: 'rename',
            oldWsPath: from.wsPath,
            newWsPath: to.wsPath,
          });
        } else if (to.kind === 'file') {
          // Atomic-write pattern (Chromium's own `.crswap` commit, sync
          // tools' write-to-temp-then-rename): content materialized at the
          // visible path from a transient one the app never showed. Treat it
          // as the visible file appearing rather than refreshing the whole
          // workspace — with self-writes deliberately unfiltered, a coarse
          // refresh here would re-list on every local save.
          specificEvents.set(`create:${to.wsPath}`, {
            type: 'create',
            wsPath: to.wsPath,
          });
        } else if (from.kind === 'file') {
          // Visible file moved to an invisible path — gone as far as the
          // app is concerned.
          specificEvents.set(`delete:${from.wsPath}`, {
            type: 'delete',
            wsPath: from.wsPath,
          });
        }
        // Both endpoints invisible: a transient-to-transient shuffle the
        // app never shows — drop it like the equivalent appeared/disappeared
        // records.
        continue;
      }

      const classified = this.classifyWatchPath(wsName, change.path);
      if (classified.kind === 'coarse') {
        needsRefresh = true;
        continue;
      }
      if (classified.kind === 'ignored') {
        // Hidden/system/transient paths (sync temp files, dotfiles) are
        // invisible to the app; ignore them entirely.
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

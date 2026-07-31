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
  isIgnoredWorkspacePathSegment,
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
  /** Disconnects the current observer, so re-arming cannot stack a second. */
  stopWatch?: () => void;
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
        if (!this.abortSignal.aborted) {
          // A load that outlived teardown must not refill the cache the
          // cleanup just cleared.
          this.fsCache.set(wsName, entry);
          this.startWatching(wsName, entry);
        }
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
    // A re-arm (after an `errored` record) must disconnect the broken
    // observer; otherwise every error cycle leaves another one attached,
    // duplicating every change it still reports.
    entry.stopWatch?.();
    entry.stopWatch = undefined;

    // Watching is best-effort; page return retries a failed start.
    void entry.fs
      .watch((changes) => this.handleWatchChanges(wsName, changes), {
        signal: this.abortSignal,
      })
      .then(({ armed, stop }) => {
        entry.watchState = armed ? 'armed' : 'idle';
        entry.stopWatch = armed ? stop : undefined;
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
   * watcher is unavailable. Refreshes are scoped to the workspaces this
   * provider actually holds, so unrelated workspaces are left alone.
   */
  private revalidateOnPageReturn(info: PageReturnInfo): void {
    const onExternalChange = this.config.onExternalChange;
    if (!onExternalChange) {
      return;
    }
    for (const [wsName, entry] of this.fsCache) {
      const wasArmed = entry.watchState === 'armed';
      this.startWatching(wsName, entry);
      if (info.returnedFromHidden || !wasArmed) {
        onExternalChange({ type: 'refresh', wsName });
      }
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
    // Locations the workspace listing never shows cannot change it, whatever
    // shape their paths have. This runs before the file-shape parse because
    // extensionless paths (`.git/HEAD`, `node_modules/.bin/tsc`) do not parse
    // as files — without it, ordinary `git` and `npm` activity inside a
    // workspace would each force a full re-list.
    if (relativePath.split('/').some(isIgnoredWorkspacePathSegment)) {
      return { kind: 'ignored' };
    }
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

  /**
   * Whether a record is too coarse to translate into a targeted event, so the
   * whole workspace has to be re-read.
   */
  private needsCoarseRefresh(wsName: string, change: NativeFsChange): boolean {
    if (change.type === 'unknown') {
      return true;
    }
    if (change.type === 'moved') {
      if (change.movedFromPath === undefined) {
        // The origin is required to determine visibility.
        return true;
      }
      const from = this.classifyWatchPath(wsName, change.movedFromPath);
      const to = this.classifyWatchPath(wsName, change.path);
      if (from.kind === 'ignored' && to.kind === 'ignored') {
        return false;
      }
      // Same as the plain branch below: a visible directory moving changes
      // the listing wholesale, and a dot-named directory would otherwise pass
      // for a file on path shape alone.
      if (change.kind === 'directory') {
        return true;
      }
      return (
        from.kind === 'coarse' ||
        to.kind === 'coarse' ||
        // Visible moves may be renames or atomic replacements.
        (from.kind === 'file' && to.kind === 'file')
      );
    }
    const classified = this.classifyWatchPath(wsName, change.path);
    if (classified.kind === 'ignored') {
      return false;
    }
    // A visible directory appearing or vanishing changes the listing.
    return change.kind === 'directory' || classified.kind === 'coarse';
  }

  /** Targeted events for a burst, deduplicated and in arrival order. */
  private toTargetedEvents(
    wsName: string,
    changes: NativeFsChange[],
  ): Map<string, FileStorageExternalChangeEvent> {
    const events = new Map<string, FileStorageExternalChangeEvent>();
    const add = (
      event: FileStorageExternalChangeEvent & { wsPath: string },
    ) => {
      events.set(`${event.type}:${event.wsPath}`, event);
    };

    for (const change of changes) {
      if (change.type === 'errored' || change.type === 'unknown') {
        // Both force a coarse refresh, so this pass never runs for them.
        continue;
      }
      if (change.type === 'moved') {
        if (change.movedFromPath === undefined) {
          // Unknown origin already forced a coarse refresh.
          continue;
        }
        // Only one side can be visible here; a visible-to-visible move was
        // already classified as needing a coarse refresh.
        const from = this.classifyWatchPath(wsName, change.movedFromPath);
        const to = this.classifyWatchPath(wsName, change.path);
        if (to.kind === 'file') {
          // Atomic write from an invisible temporary path.
          add({ type: 'create', wsPath: to.wsPath });
        } else if (from.kind === 'file') {
          // A visible file moved out of the app's listing.
          add({ type: 'delete', wsPath: from.wsPath });
        }
        continue;
      }

      const classified = this.classifyWatchPath(wsName, change.path);
      if (classified.kind !== 'file') {
        continue;
      }
      const wsPath = classified.wsPath;
      switch (change.type) {
        case 'appeared': {
          add({ type: 'create', wsPath });
          break;
        }
        case 'modified': {
          add({ type: 'update', wsPath });
          break;
        }
        case 'disappeared': {
          add({ type: 'delete', wsPath });
          break;
        }
        default: {
          const _exhaustiveCheck: never = change.type;
        }
      }
    }
    return events;
  }

  private handleWatchChanges(wsName: string, changes: NativeFsChange[]): void {
    const onExternalChange = this.config.onExternalChange;
    if (!onExternalChange) {
      return;
    }

    if (changes.some((change) => change.type === 'errored')) {
      // Observation broke; re-arm on the next page return.
      const entry = this.fsCache.get(wsName);
      if (entry) {
        entry.watchState = 'idle';
      }
      onExternalChange({ type: 'refresh', wsName });
      return;
    }
    if (changes.some((change) => this.needsCoarseRefresh(wsName, change))) {
      onExternalChange({ type: 'refresh', wsName });
      return;
    }
    for (const event of this.toTargetedEvents(wsName, changes).values()) {
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

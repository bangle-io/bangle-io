import {
  arrayEqual,
  atomWithCompare,
  BaseService,
  type BaseServiceContext,
  getAppErrorCause,
  isAbortError,
  isAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/types';
import {
  createWikiLinkIndex,
  isVisibleWorkspaceFilePath,
  type WikiLinkIndex,
  type WsFilePath,
  WsPath,
} from '@bangle.io/ws-path';
import { type Atom, atom } from 'jotai';
import { unwrap } from 'jotai/utils';
import { atomEffect } from 'jotai-effect';
import { extractLinkedWsPathsFromMarkdown } from './backlink-markdown-extractor';
import type { FileSystemService } from './file-system-service';
import type { NavigationService } from './navigation-service';
import type { WorkspaceOpsService } from './workspace-ops-service';

const EMPTY_FILE_PATH_ARRAY: WsFilePath[] = [];
const EMPTY_STRING_ARRAY: string[] = [];
const EMPTY_WORKSPACE_ARRAY: WorkspaceInfo[] = [];
const EMPTY_BACKLINKS = new Map<string, readonly WsFilePath[]>();
const BACKLINK_INDEX_REBUILD_DELAY_MS = 250;
const EMPTY_BACKLINK_INDEX_STATE: BacklinkIndexState = {
  status: 'idle',
  byTargetWsPath: EMPTY_BACKLINKS,
};

const FILE_TREE_LIST_OK: FileTreeListState = { status: 'ok' };

export type FileTreeListState =
  | { status: 'ok'; error?: undefined }
  | {
      status: 'native-fs-directory-not-found';
      error: unknown;
      wsName: string;
    }
  | { status: 'error'; error: unknown };

export type WorkspaceListState =
  | {
      status: 'loading' | 'ready';
      data: WorkspaceInfo[];
      error?: undefined;
    }
  | {
      status: 'error';
      data: WorkspaceInfo[];
      error: unknown;
    };

export type BacklinkIndexState =
  | {
      status: 'idle' | 'loading' | 'ready';
      byTargetWsPath: ReadonlyMap<string, readonly WsFilePath[]>;
      error?: undefined;
    }
  | {
      status: 'error';
      byTargetWsPath: ReadonlyMap<string, readonly WsFilePath[]>;
      error: unknown;
    };

function appendBacklink(
  map: Map<string, WsFilePath[]>,
  targetWsPath: string,
  sourcePath: WsFilePath,
) {
  const existing = map.get(targetWsPath);
  if (existing) {
    existing.push(sourcePath);
  } else {
    map.set(targetWsPath, [sourcePath]);
  }
}

function waitForBacklinkRebuildWindow(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, BACKLINK_INDEX_REBUILD_DELAY_MS);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw signal.reason ?? new Error('Backlink index rebuild aborted');
  }
}

function appendSortedUniqueWsPath(paths: string[], wsPath: string): string[] {
  if (paths.includes(wsPath)) {
    return paths;
  }

  return [...paths, wsPath].sort((a, b) => a.localeCompare(b));
}

/**
 * Manages the state of current and available workspaces
 */
export class WorkspaceStateService extends BaseService {
  static deps = ['navigation', 'fileSystem', 'workspaceOps'] as const;

  /**
   * Tracks workspace metadata refreshes without discarding the last successful
   * result when a later database read fails.
   */
  $workspaceListState = atom<WorkspaceListState>({
    status: 'loading',
    data: EMPTY_WORKSPACE_ARRAY,
  });

  $workspaces = atom<WorkspaceInfo[]>((get) => {
    return get(this.$workspaceListState).data;
  });

  private $rawWsPaths = atomWithCompare<string[]>(
    EMPTY_STRING_ARRAY,
    arrayEqual,
  );

  /**
   * Tracks whether the most recent workspace file listing succeeded. On
   * failure the last known file tree is preserved (see hookMount), so
   * consumers should use this atom to surface a recoverable error state
   * instead of treating the preserved tree as fresh.
   */
  $fileTreeListState = atom<FileTreeListState>(FILE_TREE_LIST_OK);

  $wsPaths = atom<WsFilePath[]>((get) => {
    return get(this.$rawWsPaths)
      .map((path) => WsPath.fromString(path).asFile())
      .filter((path) => path !== undefined);
  });

  $noteWsPaths = atom<WsFilePath[]>((get) => {
    return get(this.$wsPaths).filter((path) => path.isMarkdown());
  });

  $wikiLinkIndex = atom<WikiLinkIndex | undefined>((get) => {
    const wsName = get(this.$currentWsName);
    return wsName
      ? createWikiLinkIndex(get(this.$noteWsPaths), wsName)
      : undefined;
  });

  private $backlinkIndexAsync = atom<Promise<BacklinkIndexState>>(
    async (get, { signal }) => {
      const wsName = get(this.$currentWsName);
      const wsPaths = get(this.$noteWsPaths);
      get(this.fileSystem.$fileContentUpdateCount);

      if (!wsName) {
        return EMPTY_BACKLINK_INDEX_STATE;
      }

      await waitForBacklinkRebuildWindow(signal);

      try {
        const byTargetWsPath = await this.buildBacklinkIndex({
          signal,
          wsName,
          wsPaths,
        });
        return { status: 'ready', byTargetWsPath };
      } catch (error: unknown) {
        if (signal.aborted) {
          throw error;
        }

        this.logger.error('Failed to build backlink index', error);
        return {
          status: 'error',
          byTargetWsPath: EMPTY_BACKLINKS,
          error,
        };
      }
    },
  );

  $backlinkIndex: Atom<BacklinkIndexState> = unwrap(
    this.$backlinkIndexAsync,
    (previous) =>
      previous ?? { status: 'loading', byTargetWsPath: EMPTY_BACKLINKS },
  );

  $activeWsPaths = atom<WsFilePath[]>((get) => {
    const wsPath = get(this.navigation.$activeWsFilePath);
    return wsPath ? [wsPath] : EMPTY_FILE_PATH_ARRAY;
  });

  /**
   * This atom is used to check if the current file path is on the disk.
   */
  $currentWsFilePath = atom((get) => {
    const wsPath = get(this.navigation.$activeWsFilePath);
    const rawWsPaths = get(this.$rawWsPaths);
    return wsPath && rawWsPaths.includes(wsPath.wsPath) ? wsPath : undefined;
  });

  /**
   * This atom is used to check if the current note path is on the disk.
   */
  $currentWsPath = atom((get) => {
    const wsPath = get(this.navigation.$wsFilePath);
    const rawWsPaths = get(this.$rawWsPaths);
    return wsPath?.isMarkdown() && rawWsPaths.includes(wsPath.wsPath)
      ? wsPath
      : undefined;
  });

  /**
   * This atom is used to check if the current workspace even exists.
   * Prefer using this over $wsName as it is more robust.
   */
  $currentWsName = atom((get) => {
    const wsName = get(this.navigation.$wsName);
    const workspaces = get(this.$workspaces);
    return workspaces.find((ws) => ws.name === wsName)?.name;
  });

  resolveAtoms() {
    return {
      workspaces: this.store.get(this.$workspaces),
      wsPaths: this.store.get(this.$wsPaths),
      noteWsPaths: this.store.get(this.$noteWsPaths),
      currentWsName: this.store.get(this.$currentWsName),
      currentWsFilePath: this.store.get(this.$currentWsFilePath),
      currentWsPath: this.store.get(this.$currentWsPath),
    };
  }

  constructor(
    context: BaseServiceContext,
    private dep: {
      navigation: NavigationService;
      fileSystem: FileSystemService;
      workspaceOps: WorkspaceOpsService;
    },
  ) {
    super(SERVICE_NAME.workspaceStateService, context, dep);
  }

  private createdWsPathsBySequence = new Map<number, string>();
  private handledFileCreateSequence = 0;
  private lastKnownWorkspaces = EMPTY_WORKSPACE_ARRAY;
  private lastListedWsName: string | undefined;

  async hookMount(): Promise<void> {
    this.addCleanup(
      this.store.sub(
        atomEffect((get, set) => {
          const abortController = new AbortController();
          get(this.workspaceOps.$workspaceInfoChange);
          set(this.$workspaceListState, {
            status: 'loading',
            data: this.lastKnownWorkspaces,
          });

          this.workspaceOps.getAllWorkspaces().then(
            (workspaces) => {
              if (abortController.signal.aborted) {
                return;
              }
              this.lastKnownWorkspaces = workspaces;
              set(this.$workspaceListState, {
                status: 'ready',
                data: workspaces,
              });
            },
            (error: unknown) => {
              if (abortController.signal.aborted) {
                return;
              }
              set(this.$workspaceListState, {
                status: 'error',
                data: this.lastKnownWorkspaces,
                error,
              });
              if (error instanceof Error && isAppError(error)) {
                this.emitAppError(error);
              } else {
                this.logger.error('Failed to list workspaces', error);
              }
            },
          );

          return () => {
            abortController.abort();
          };
        }),
        () => {},
      ),
    );

    this.addCleanup(
      this.store.sub(
        atomEffect((get, set) => {
          const abortController = new AbortController();
          get(this.fileSystem.$fileTreeChangeCount);
          const wsName = get(this.$currentWsName);
          const createSequenceAtScanStart = this.handledFileCreateSequence;
          if (!wsName) {
            this.lastListedWsName = undefined;
            set(this.$rawWsPaths, EMPTY_STRING_ARRAY);
            set(this.$fileTreeListState, FILE_TREE_LIST_OK);
            return;
          }
          this.fileSystem
            .listWorkspaceFiles(wsName, abortController.signal)
            .then(
              (paths) => {
                if (abortController.signal.aborted) {
                  return;
                }
                this.lastListedWsName = wsName;
                set(
                  this.$rawWsPaths,
                  this.mergeCreatedWsPathsAfterSequence({
                    paths,
                    sequence: createSequenceAtScanStart,
                    wsName,
                  }),
                );
                this.pruneCreatedWsPathsThrough(createSequenceAtScanStart);
                set(this.$fileTreeListState, FILE_TREE_LIST_OK);
              },
              (error: unknown) => {
                if (abortController.signal.aborted || isAbortError(error)) {
                  return;
                }
                // A transient list failure must not make existing notes appear
                // deleted: keep the last known tree for the same workspace. If
                // the failure happened while switching workspaces there is no
                // trustworthy tree to preserve, so clear it instead of showing
                // another workspace's files.
                if (this.lastListedWsName !== wsName) {
                  set(this.$rawWsPaths, EMPTY_STRING_ARRAY);
                }
                const appError = isAppError(error)
                  ? getAppErrorCause(error)
                  : undefined;
                if (
                  appError?.name ===
                    'error::file-storage:file-does-not-exist' &&
                  appError.payload.storage ===
                    SERVICE_NAME.fileStorageNativeFsService &&
                  appError.payload.wsPath === `${wsName}:`
                ) {
                  set(this.$fileTreeListState, {
                    status: 'native-fs-directory-not-found',
                    error,
                    wsName,
                  });
                } else {
                  set(this.$fileTreeListState, { status: 'error', error });
                }
                if (error instanceof Error && isAppError(error)) {
                  this.emitAppError(error);
                } else {
                  this.logger.error(
                    `Failed to list files for workspace ${wsName}`,
                    error,
                  );
                }
              },
            );
          return () => {
            abortController.abort();
          };
        }),
        () => {},
      ),
    );

    this.addCleanup(
      this.store.sub(
        atomEffect((get, set) => {
          const createEvent = get(this.fileSystem.$fileCreateEvent);
          if (
            !createEvent ||
            createEvent.sequence <= this.handledFileCreateSequence
          ) {
            return;
          }
          this.handledFileCreateSequence = createEvent.sequence;

          const filePath = this.getVisibleWorkspaceFilePath(createEvent.wsPath);
          const wsName = get(this.$currentWsName);
          if (!wsName || !filePath || filePath.wsName !== wsName) {
            return;
          }
          this.createdWsPathsBySequence.set(
            createEvent.sequence,
            filePath.wsPath,
          );

          set(
            this.$rawWsPaths,
            appendSortedUniqueWsPath(get(this.$rawWsPaths), filePath.wsPath),
          );
        }),
        () => {},
      ),
    );
  }

  private get navigation() {
    return this.dep.navigation;
  }

  private get fileSystem() {
    return this.dep.fileSystem;
  }

  private get workspaceOps() {
    return this.dep.workspaceOps;
  }

  private getVisibleWorkspaceFilePath(wsPath: string): WsFilePath | undefined {
    const filePath = WsPath.safeParse(wsPath).data?.asFile();
    return filePath && isVisibleWorkspaceFilePath(filePath)
      ? filePath
      : undefined;
  }

  private mergeCreatedWsPathsAfterSequence({
    paths,
    sequence,
    wsName,
  }: {
    paths: string[];
    sequence: number;
    wsName: string;
  }): string[] {
    let nextPaths = paths.flatMap((wsPath) => {
      const filePath = this.getVisibleWorkspaceFilePath(wsPath);
      return filePath?.wsName === wsName ? [filePath.wsPath] : [];
    });
    for (const [createSequence, createdWsPath] of this
      .createdWsPathsBySequence) {
      if (createSequence <= sequence) {
        continue;
      }
      const filePath = this.getVisibleWorkspaceFilePath(createdWsPath);
      if (filePath?.wsName === wsName) {
        nextPaths = appendSortedUniqueWsPath(nextPaths, filePath.wsPath);
      }
    }
    return nextPaths;
  }

  private pruneCreatedWsPathsThrough(sequence: number): void {
    for (const createSequence of this.createdWsPathsBySequence.keys()) {
      if (createSequence <= sequence) {
        this.createdWsPathsBySequence.delete(createSequence);
      }
    }
  }

  hasWorkspace(wsName: string) {
    const workspaces = this.store.get(this.$workspaces);
    return workspaces.some((ws) => ws.name === wsName);
  }

  private async buildBacklinkIndex({
    signal,
    wsName,
    wsPaths,
  }: {
    signal: AbortSignal;
    wsName: string;
    wsPaths: readonly WsFilePath[];
  }): Promise<ReadonlyMap<string, readonly WsFilePath[]>> {
    throwIfAborted(signal);
    const sourcePaths = wsPaths.filter(
      (path) => path.wsName === wsName && path.isMarkdown(),
    );
    const wikiLinkIndex = createWikiLinkIndex(wsPaths, wsName);
    const byTargetWsPath = new Map<string, WsFilePath[]>();

    for (const sourcePath of sourcePaths) {
      throwIfAborted(signal);
      const linkedWsPaths = await this.readOutgoingLinkedWsPaths({
        signal,
        sourcePath,
        wikiLinkIndex,
      });
      if (linkedWsPaths === undefined) {
        throw new Error(`Unable to read backlink source: ${sourcePath.wsPath}`);
      }

      for (const linkedWsPath of linkedWsPaths) {
        appendBacklink(byTargetWsPath, linkedWsPath, sourcePath);
      }
    }

    throwIfAborted(signal);
    for (const sources of byTargetWsPath.values()) {
      sources.sort((a, b) => a.filePath.localeCompare(b.filePath));
    }
    return byTargetWsPath;
  }

  private async readOutgoingLinkedWsPaths({
    signal,
    sourcePath,
    wikiLinkIndex,
  }: {
    signal: AbortSignal;
    sourcePath: WsFilePath;
    wikiLinkIndex: WikiLinkIndex;
  }): Promise<readonly string[] | undefined> {
    throwIfAborted(signal);
    const markdown = await this.fileSystem.readFileAsText(sourcePath.wsPath, {
      signal,
    });
    throwIfAborted(signal);
    if (markdown === undefined) {
      return undefined;
    }
    return extractLinkedWsPathsFromMarkdown({
      currentWsPath: sourcePath,
      index: wikiLinkIndex,
      markdown,
    });
  }
}

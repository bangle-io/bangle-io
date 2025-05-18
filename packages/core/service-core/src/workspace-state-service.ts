import {
  BaseService,
  type BaseServiceContext,
  arrayEqual,
  atomWithCompare,
  createAsyncAtom,
  wrapPromiseInAppErrorHandler,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import { type WsFilePath, WsPath } from '@bangle.io/ws-path';
import { atom } from 'jotai';
import { atomEffect } from 'jotai-effect';
import type { FileSystemService } from './file-system-service';
import type { NavigationService } from './navigation-service';
import type { WorkspaceOpsService } from './workspace-ops-service';

const EMPTY_FILE_PATH_ARRAY: WsFilePath[] = [];
const EMPTY_STRING_ARRAY: string[] = [];

/**
 * Manages the state of current and available workspaces
 */
export class WorkspaceStateService extends BaseService {
  static deps = ['navigation', 'fileSystem', 'workspaceOps'] as const;

  $workspaces = createAsyncAtom(
    async (get) => {
      get(this.workspaceOps.$workspaceInfoListChange);
      const workspaces = await this.workspaceOps.getAllWorkspaces();
      return workspaces;
    },
    (prev) => prev || [],
    this.emitAppError,
  );

  private $rawWsPaths = atomWithCompare<string[]>(
    EMPTY_STRING_ARRAY,
    arrayEqual,
  );

  $wsPaths = atom<WsFilePath[]>((get) => {
    return get(this.$rawWsPaths)
      .map((path) => WsPath.fromString(path).asFile())
      .filter((path) => path !== undefined);
  });

  $activeWsPaths = atom<WsFilePath[]>((get) => {
    const wsPath = get(this.navigation.$wsFilePath);
    return wsPath ? [wsPath] : EMPTY_FILE_PATH_ARRAY;
  });

  /**
   * This atom is used to check if the current note path
   * is on the disk.
   * TODO: rename to currentWsFilePath
   */
  $currentWsPath = atom((get) => {
    const wsPath = get(this.navigation.$wsFilePath);
    const rawWsPaths = get(this.$rawWsPaths);
    return wsPath && rawWsPaths.includes(wsPath.wsPath) ? wsPath : undefined;
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
      currentWsName: this.store.get(this.$currentWsName),
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

  async hookMount(): Promise<void> {
    this.addCleanup(
      this.store.sub(
        atomEffect((get, set) => {
          const abortController = new AbortController();
          get(this.fileSystem.$fileTreeChangeCount);
          const wsName = get(this.$currentWsName);
          if (!wsName) {
            set(this.$rawWsPaths, EMPTY_STRING_ARRAY);
            return;
          }
          wrapPromiseInAppErrorHandler(
            this.fileSystem.listFiles(wsName, abortController.signal),
            EMPTY_STRING_ARRAY,
            this.emitAppError,
          ).then((paths) => {
            if (!abortController.signal.aborted) {
              set(this.$rawWsPaths, paths);
            }
          });
          return () => {
            abortController.abort();
          };
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

  hasWorkspace(wsName: string) {
    const workspaces = this.store.get(this.$workspaces);
    return workspaces.some((ws) => ws.name === wsName);
  }
}

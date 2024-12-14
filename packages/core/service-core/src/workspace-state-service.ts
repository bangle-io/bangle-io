import {
  BaseService2,
  type BaseServiceContext,
  arrayEqual,
  atomWithCompare,
} from '@bangle.io/base-utils';
import type { WorkspaceInfo } from '@bangle.io/types';
import { atom } from 'jotai';
import { atomEffect } from 'jotai-effect';
import { unwrap } from 'jotai/utils';
import type { FileSystemService } from './file-system-service';
import type { NavigationService } from './navigation-service';
import type { WorkspaceOpsService } from './workspace-ops-service';

const EMPTY_ARRAY: string[] = [];

/**
 * Manages the state of current and available workspaces
 */
export class WorkspaceStateService extends BaseService2 {
  static deps = ['navigation', 'fileSystem', 'workspaceOps'] as const;

  $workspaces = unwrap(
    atom<Promise<WorkspaceInfo[]>>(async (get) => {
      get(this.workspaceOps.$workspaceInfoListChange);
      return this.atomHandleAppError(this.workspaceOps.getAllWorkspaces(), []);
    }),
    (prev): WorkspaceInfo[] => prev || [],
  );

  $wsName = atom<string | undefined>((get) => get(this.navigation.$wsName));
  $wsPath = atom<string | undefined>((get) => get(this.navigation.$wsPath));
  private $rawWsPaths = atomWithCompare<string[]>(EMPTY_ARRAY, arrayEqual);
  $wsPaths = atom((get) => {
    return get(this.$rawWsPaths);
  });
  $activeWsPaths = atom<string[]>((get) => {
    const wsPath = get(this.$wsPath);
    return wsPath ? [wsPath] : EMPTY_ARRAY;
  });

  constructor(
    context: BaseServiceContext,
    private dep: {
      navigation: NavigationService;
      fileSystem: FileSystemService;
      workspaceOps: WorkspaceOpsService;
    },
  ) {
    super('workspace-state', context, dep);
  }

  async hookMount(): Promise<void> {
    this.addCleanup(
      this.store.sub(
        atomEffect((get, set) => {
          const abortController = new AbortController();
          get(this.fileSystem.$fileTreeChangeCount);
          const wsName = get(this.$wsName);

          if (!wsName) {
            return;
          }
          this.atomHandleAppError(
            this.fileSystem.listFiles(wsName, abortController.signal),
            EMPTY_ARRAY,
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
}

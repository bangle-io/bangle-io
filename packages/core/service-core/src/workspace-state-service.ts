import {
  BaseService,
  arrayEqual,
  atomWithCompare,
} from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions, WorkspaceInfo } from '@bangle.io/types';
import { atom } from 'jotai';
import { atomEffect } from 'jotai-effect';
import { unwrap } from 'jotai/utils';
import type { FileSystemService } from './file-system-service';
import type { NavigationService } from './navigation-service';
import type { WorkspaceOpsService } from './workspace-ops-service';

const EMPTY_ARRAY: string[] = [];
/**
 * A service that focuses on managing the workspace state
 */
export class WorkspaceStateService extends BaseService {
  private navigation: NavigationService;
  private fileSystem: FileSystemService;
  private workspaceOps: WorkspaceOpsService;

  $workspaces = unwrap(
    atom<Promise<WorkspaceInfo[]>>(async (get) => {
      // to subscribe to workspace changes
      get(this.workspaceOps.$workspaceInfoListChange);
      return this.atomHandleAppError(this.workspaceOps.getAllWorkspaces(), []);
    }),
    (prev): WorkspaceInfo[] => prev || [],
  );
  $wsName = atom<string | undefined>((get) => get(this.navigation.$wsName));
  $wsPath = atom<string | undefined>((get) => get(this.navigation.$wsPath));
  $wsPaths = atom((get) => {
    return get(this.$rawWsPaths);
  });
  private $rawWsPaths = atomWithCompare<string[]>(EMPTY_ARRAY, arrayEqual);
  $activeWsPaths = atom<string[]>((get) => {
    const wsPath = get(this.$wsPath);
    return wsPath ? [wsPath] : EMPTY_ARRAY;
  });

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: {
      navigation: NavigationService;
      fileSystem: FileSystemService;
      workspaceOps: WorkspaceOpsService;
    },
  ) {
    super({
      ...baseOptions,
      name: 'workspace-state',
      kind: 'core',
      dependencies,
    });
    this.navigation = dependencies.navigation;
    this.fileSystem = dependencies.fileSystem;
    this.workspaceOps = dependencies.workspaceOps;
  }

  protected async onInitialize(): Promise<void> {
    this.addCleanup(
      this.store.sub(
        atomEffect((get, set) => {
          const abortController = new AbortController();
          // to subscribe to file changes
          get(this.fileSystem.$fileTreeChangeCount);
          const wsName = get(this.$wsName);

          if (!wsName) {
            return;
          }
          this.atomHandleAppError(
            this.fileSystem.listFiles(wsName, abortController.signal),
            EMPTY_ARRAY,
          ).then((paths) => {
            if (abortController.signal.aborted) {
              return;
            }
            set(this.$rawWsPaths, paths);
          });
          return () => {
            abortController.abort();
          };
        }),
        () => {},
      ),
    );
  }

  protected async onDispose(): Promise<void> {}
}

import { BaseService } from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions, WorkspaceInfo } from '@bangle.io/types';
import { atom } from 'jotai';
import { unwrap } from 'jotai/utils';
import type { FileSystemService } from './file-system-service';
import type { NavigationService } from './navigation-service';
import type { WorkspaceOpsService } from './workspace-ops-service';

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
      get(this.workspaceOps.$workspaceChanged);
      return this.atomHandleAppError(this.workspaceOps.getAllWorkspaces(), []);
    }),
    (): WorkspaceInfo[] => [],
  );
  $wsName = atom<string | undefined>((get) => get(this.navigation.$wsName));
  $wsPath = atom<string | undefined>((get) => get(this.navigation.$wsPath));
  $wsPaths = unwrap<Promise<string[]>, string[]>(
    atom(async (get, { signal }) => {
      // to subscribe to file changes
      get(this.fileSystem.$fileChanged);
      const wsName = get(this.$wsName);
      if (!wsName) {
        return [];
      }
      return this.atomHandleAppError(
        this.fileSystem.listFiles(wsName, signal),
        [],
      );
    }),
    () => [],
  );

  $activeWsPaths = atom<string[]>((get) => {
    const wsPath = get(this.$wsPath);
    return wsPath ? [wsPath] : [];
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

  protected async onInitialize(): Promise<void> {}

  protected async onDispose(): Promise<void> {}
}

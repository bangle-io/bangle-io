import { BaseService } from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions } from '@bangle.io/types';
import type { FileSystemService } from './file-system-service';
import type { NavigationService } from './navigation-service';
import type { WorkspaceOpsService } from './workspace-ops-service';
import type { WorkspaceStateService } from './workspace-state-service';

/**
 * A service that focuses on managing the workspace
 */
export class WorkspaceService extends BaseService {
  private workspaceOps: WorkspaceOpsService;
  private workspaceState: WorkspaceStateService;
  private fileSystem: FileSystemService;
  private navigation: NavigationService;

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: {
      fileSystem: FileSystemService;
      navigation: NavigationService;
      workspaceOps: WorkspaceOpsService;
      workspaceState: WorkspaceStateService;
    },
  ) {
    super({
      ...baseOptions,
      name: 'workspace',
      kind: 'core',
      dependencies,
    });

    this.workspaceOps = dependencies.workspaceOps;
    this.workspaceState = dependencies.workspaceState;
    this.fileSystem = dependencies.fileSystem;
    this.navigation = dependencies.navigation;
  }

  protected async onInitialize(): Promise<void> {}

  protected async onDispose(): Promise<void> {}
}

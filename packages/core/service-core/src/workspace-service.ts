import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';
import type { FileSystemService } from './file-system-service';
import type { NavigationService } from './navigation-service';
import type { WorkspaceOpsService } from './workspace-ops-service';
import type { WorkspaceStateService } from './workspace-state-service';

/**
 * Manages workspace-level operations from a UI and logic perspective
 */
export class WorkspaceService extends BaseService2 {
  static deps = [
    'fileSystem',
    'navigation',
    'workspaceOps',
    'workspaceState',
  ] as const;

  constructor(
    context: BaseServiceContext,
    private dep: {
      fileSystem: FileSystemService;
      navigation: NavigationService;
      workspaceOps: WorkspaceOpsService;
      workspaceState: WorkspaceStateService;
    },
  ) {
    super('workspace', context, dep);
  }

  hookMount() {
    // no-op currently
  }
}

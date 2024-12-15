import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type { FileSystemService } from './file-system-service';
import type { NavigationService } from './navigation-service';
import type { WorkspaceOpsService } from './workspace-ops-service';
import type { WorkspaceStateService } from './workspace-state-service';

/**
 * Manages workspace-level operations from a UI and logic perspective
 */
export class WorkspaceService extends BaseService {
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
    super(SERVICE_NAME.workspaceService, context, dep);
  }

  hookMount() {
    // no-op currently
  }
}

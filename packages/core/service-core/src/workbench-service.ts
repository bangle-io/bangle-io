import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';
import type { WorkbenchStateService } from './workbench-state-service';

/**
 * Manages the Workbench (UI) level operations
 */
export class WorkbenchService extends BaseService2 {
  static deps = ['workbenchState'] as const;

  constructor(
    context: BaseServiceContext,
    private dep: {
      workbenchState: WorkbenchStateService;
    },
  ) {
    super('workbench', context, dep);
  }

  hookMount() {
    // no-op currently
  }

  get workbenchState() {
    return this.dep.workbenchState;
  }
}

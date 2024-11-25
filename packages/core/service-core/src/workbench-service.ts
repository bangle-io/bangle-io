import { BaseService } from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions } from '@bangle.io/types';
import { atom } from 'jotai';
import type { WorkbenchStateService } from './workbench-state-service';

/**
 * a service that focuses on managing the Workbench (UI)
 */
export class WorkbenchService extends BaseService {
  workbenchState: WorkbenchStateService;

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: {
      workbenchState: WorkbenchStateService;
    },
  ) {
    super({
      ...baseOptions,
      name: 'workbench',
      kind: 'core',
      dependencies,
    });
    this.workbenchState = dependencies.workbenchState;
  }

  protected async onInitialize(): Promise<void> {
    // Initialization logic if needed
  }

  protected async onDispose(): Promise<void> {}
}

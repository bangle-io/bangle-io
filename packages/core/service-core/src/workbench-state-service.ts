import { BaseService } from '@bangle.io/base-utils';
import { throwAppError } from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions } from '@bangle.io/types';
import { atom } from 'jotai';

/**
 * a service that focuses on the workbench (UI) state
 */
export class WorkbenchStateService extends BaseService {
  $sidebarOpen = atom(true);
  $openWsDialog = atom(false);
  $openOmniSearch = atom(false);
  $newNoteDialog = atom(false);

  $singleSelectDialog = atom<
    | undefined
    | {
        dialogId: string;
        options: { id: string; title?: string }[];
        onSelect: (option: { id: string; title?: string }) => void;
        placeholder?: string;
      }
  >(undefined);

  constructor(baseOptions: BaseServiceCommonOptions, dependencies: undefined) {
    super({
      ...baseOptions,
      name: 'workbench-state',
      kind: 'core',
      dependencies,
    });
  }

  protected async onInitialize(): Promise<void> {
    // Initialization logic if needed
  }

  protected async onDispose(): Promise<void> {}
}

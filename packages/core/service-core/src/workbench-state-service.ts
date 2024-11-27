import { BaseService } from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions } from '@bangle.io/types';
import type { DialogSingleSelectProps } from '@bangle.io/ui-components';
import { atom } from 'jotai';

import type {
  ThemeConfig,
  ThemeManager,
} from '@bangle.io/color-scheme-manager';
/**
 * a service that focuses on the workbench (UI) state
 */
export class WorkbenchStateService extends BaseService {
  $sidebarOpen = atom(true);
  $openWsDialog = atom(false);
  $openOmniSearch = atom(false);
  $newNoteDialog = atom(false);
  $themePref = atom<ThemeConfig['defaultPreference']>('system');

  $singleSelectDialog = atom<
    | undefined
    | ({
        dialogId: string;
      } & Omit<DialogSingleSelectProps, 'open' | 'setOpen'>)
  >(undefined);

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: undefined,
    private themeManager: ThemeManager,
  ) {
    super({
      ...baseOptions,
      name: 'workbench-state',
      kind: 'core',
      dependencies,
    });
  }

  protected async onInitialize(): Promise<void> {
    this.store.set(this.$themePref, this.themeManager.currentPreference);
    const cleanup = this.themeManager.onThemeChange(({ preference }) => {
      this.store.set(this.$themePref, preference);
    });

    this.abortSignal.addEventListener('abort', () => {
      cleanup();
    });
  }

  changeThemePreference(preference: ThemeConfig['defaultPreference']) {
    this.themeManager.setPreference(preference);
  }

  protected async onDispose(): Promise<void> {}
}

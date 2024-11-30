import { BaseService } from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions } from '@bangle.io/types';
import type {
  AppAlertDialogProps,
  DialogSingleInputProps,
  DialogSingleSelectProps,
} from '@bangle.io/ui-components';
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
  $themePref = atom<ThemeConfig['defaultPreference']>('system');
  $singleInputDialog = atom<
    | undefined
    | ({
        dialogId: `dialog::${string}`;
      } & Omit<DialogSingleInputProps, 'open' | 'setOpen'>)
  >(undefined);
  $singleSelectDialog = atom<
    | undefined
    | ({
        dialogId: `dialog::${string}`;
      } & Omit<DialogSingleSelectProps, 'open' | 'setOpen'>)
  >(undefined);
  $alertDialog = atom<
    | undefined
    | ({ dialogId: `dialog::${string}` } & Omit<
        AppAlertDialogProps,
        'open' | 'setOpen'
      >)
  >();

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
    this.addCleanup(
      this.themeManager.onThemeChange(({ preference }) => {
        this.store.set(this.$themePref, preference);
      }),
    );
  }

  changeThemePreference(preference: ThemeConfig['defaultPreference']) {
    this.themeManager.setPreference(preference);
  }

  protected async onDispose(): Promise<void> {}
}

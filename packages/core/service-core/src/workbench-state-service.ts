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

type Route = 'omni-home' | 'omni-command' | 'omni-filtered';

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
  $omniSearchInput = atom('');
  $omniSearchRoute = atom<Route>((get) => {
    const input = get(this.$omniSearchInput);
    return input === ''
      ? 'omni-home'
      : input.startsWith('>')
        ? 'omni-command'
        : 'omni-filtered';
  });

  $cleanSearchTerm = atom((get) => {
    const search = get(this.$omniSearchInput);
    const route = get(this.$omniSearchRoute);

    if (route === 'omni-command') {
      return search.slice(1).trim().toLowerCase();
    }
    return search.trim().toLowerCase();
  });

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

  updateOmniSearchInput(input: string) {
    this.store.set(this.$omniSearchInput, input);
  }

  resetOmniSearch() {
    this.store.set(this.$omniSearchInput, '');
  }

  protected async onDispose(): Promise<void> {}
}

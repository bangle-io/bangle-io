import {
  atomStorage,
  BaseService,
  getEventSenderMetadata,
} from '@bangle.io/base-utils';
import type {
  ThemeConfig,
  ThemeManager,
} from '@bangle.io/color-scheme-manager';
import { T } from '@bangle.io/mini-zod';
import type {
  BaseDatabaseService,
  BaseServiceCommonOptions,
  BaseSyncDatabaseService,
  ScopedEmitter,
} from '@bangle.io/types';
import type {
  AppAlertDialogProps,
  DialogSingleInputProps,
  DialogSingleSelectProps,
} from '@bangle.io/ui-components';
import { atom, type PrimitiveAtom, type WritableAtom } from 'jotai';
import { atomEffect } from 'jotai-effect';
import { atomWithStorage } from 'jotai/utils';

type Route = 'omni-home' | 'omni-command' | 'omni-filtered';

// Pure function to determine the omni search route based on current route and input
function determineOmniSearchRoute(input: string, currentRoute: Route): Route {
  switch (currentRoute) {
    case 'omni-home': {
      if (input.startsWith('>')) {
        return 'omni-command';
      }

      return 'omni-filtered';
    }

    case 'omni-command': {
      if (!input.startsWith('>')) {
        if (input.trim() === '') {
          return 'omni-home';
        }
        return 'omni-filtered';
      }
      return 'omni-command';
    }
    case 'omni-filtered': {
      // Once in filtered mode, stay there unless input is empty
      if (input.trim() === '') {
        return 'omni-home';
      }
      return 'omni-filtered';
    }
    default: {
      return 'omni-home';
    }
  }
}
/**
 * a service that focuses on the workbench (UI) state
 */
export class WorkbenchStateService extends BaseService {
  private $_wideEditor: PrimitiveAtom<boolean> | undefined;
  get $wideEditor() {
    if (!this.$_wideEditor) {
      this.$_wideEditor = atomStorage({
        key: 'wide-editor',
        initValue: true,
        syncDb: this.syncDatabase,
        validator: T.Boolean,
        logger: this.logger,
      });
    }
    return this.$_wideEditor;
  }

  private $_sidebarOpen: PrimitiveAtom<boolean> | undefined;
  get $sidebarOpen() {
    if (!this.$_sidebarOpen) {
      this.$_sidebarOpen = atomStorage({
        key: 'sidebar-open',
        initValue: true,
        syncDb: this.syncDatabase,
        validator: T.Boolean,
        logger: this.logger,
      });
    }

    return this.$_sidebarOpen;
  }

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
  $omniSearchRoute = atom<Route>('omni-home');
  $openAllFiles = atom(false);
  $allFilesSearchInput = atom('');

  private syncDatabase: BaseSyncDatabaseService;

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
    dependencies: {
      database: BaseDatabaseService;
      syncDatabase: BaseSyncDatabaseService;
    },
    private options: {
      themeManager: ThemeManager;
      emitter: ScopedEmitter<'event::app:reload-ui'>;
    },
  ) {
    super({
      ...baseOptions,
      name: 'workbench-state',
      kind: 'core',
      dependencies,
    });

    this.syncDatabase = dependencies.syncDatabase;
  }

  protected async hookOnInitialize(): Promise<void> {
    this.store.set(
      this.$themePref,
      this.options.themeManager.currentPreference,
    );
    this.addCleanup(
      this.options.themeManager.onThemeChange(({ preference }) => {
        this.store.set(this.$themePref, preference);
      }),
      this.store.sub(
        atomEffect((get, set) => {
          const open = get(this.$openAllFiles);
          if (!open) {
            set(this.$allFilesSearchInput, '');
          }
        }),
        () => {},
      ),

      this.store.sub(
        atomEffect((get, set) => {
          const open = get(this.$openOmniSearch);
          if (!open) {
            set(this.$omniSearchInput, '');
          }
        }),
        () => {},
      ),
      // Update route state management
      this.store.sub(this.$omniSearchInput, () => {
        const input = this.store.get(this.$omniSearchInput);
        const currentRoute = this.store.get(this.$omniSearchRoute);
        const newRoute = determineOmniSearchRoute(input, currentRoute);
        if (newRoute !== currentRoute) {
          this.store.set(this.$omniSearchRoute, newRoute);
        }
      }),
    );
  }

  changeThemePreference(preference: ThemeConfig['defaultPreference']) {
    this.options.themeManager.setPreference(preference);
  }

  updateOmniSearchInput(input: string) {
    this.store.set(this.$omniSearchInput, input);
  }

  resetOmniSearch() {
    this.store.set(this.$omniSearchInput, '');
    this.store.set(this.$omniSearchRoute, 'omni-home');
  }

  goToCommandRoute() {
    this.store.set(this.$openOmniSearch, true);
    this.store.set(this.$omniSearchInput, '>');
  }

  reloadUi() {
    this.options.emitter.emit('event::app:reload-ui', {
      sender: getEventSenderMetadata({ tag: this.name }),
    });
  }
  protected async hookOnDispose(): Promise<void> {}
}

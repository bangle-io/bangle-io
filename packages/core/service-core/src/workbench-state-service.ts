import {
  BaseService2,
  type BaseServiceContext,
  atomStorage,
  getEventSenderMetadata,
} from '@bangle.io/base-utils';
import type {
  ThemeConfig,
  ThemeManager,
} from '@bangle.io/color-scheme-manager';
import { T } from '@bangle.io/mini-zod';
import type {
  BaseDatabaseService,
  BaseSyncDatabaseService,
  ScopedEmitter,
} from '@bangle.io/types';
import type {
  AppAlertDialogProps,
  DialogSingleInputProps,
  DialogSingleSelectProps,
} from '@bangle.io/ui-components';
import { type PrimitiveAtom, atom } from 'jotai';
import { atomEffect } from 'jotai-effect';
import { atomWithStorage } from 'jotai/utils';

type Route = 'omni-home' | 'omni-command' | 'omni-filtered';

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
 * Manages UI state such as theme preferences, dialogs, and omni-search state
 */
export class WorkbenchStateService extends BaseService2 {
  static deps = ['database', 'syncDatabase'] as const;

  private $_wideEditor: PrimitiveAtom<boolean> | undefined;
  private $_sidebarOpen: PrimitiveAtom<boolean> | undefined;

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

  $cleanSearchTerm = atom((get) => {
    const search = get(this.$omniSearchInput);
    const route = get(this.$omniSearchRoute);

    if (route === 'omni-command') {
      return search.slice(1).trim().toLowerCase();
    }
    return search.trim().toLowerCase();
  });

  constructor(
    context: BaseServiceContext,
    private dep: {
      database: BaseDatabaseService;
      syncDatabase: BaseSyncDatabaseService;
    },
    private config: {
      themeManager: ThemeManager;
      emitter: ScopedEmitter<'event::app:reload-ui'>;
    },
  ) {
    super('workbench-state', context, dep);
    this.store.set(this.$themePref, this.config.themeManager.currentPreference);
  }

  hookMount() {
    this.addCleanup(
      this.config.themeManager.onThemeChange(({ preference }) => {
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

  public changeThemePreference(preference: ThemeConfig['defaultPreference']) {
    this.config.themeManager.setPreference(preference);
  }

  public updateOmniSearchInput(input: string) {
    this.store.set(this.$omniSearchInput, input);
  }

  public resetOmniSearch() {
    this.store.set(this.$omniSearchInput, '');
    this.store.set(this.$omniSearchRoute, 'omni-home');
  }

  public goToCommandRoute() {
    this.store.set(this.$openOmniSearch, true);
    this.store.set(this.$omniSearchInput, '>');
  }

  public reloadUi() {
    this.config.emitter.emit('event::app:reload-ui', {
      sender: getEventSenderMetadata({ tag: this.name }),
    });
  }

  get $wideEditor() {
    if (!this.$_wideEditor) {
      this.$_wideEditor = atomStorage({
        key: 'wide-editor',
        initValue: true,
        syncDb: this.dep.syncDatabase,
        validator: T.Boolean,
        logger: this.logger,
      });
    }
    return this.$_wideEditor;
  }

  get $sidebarOpen() {
    if (!this.$_sidebarOpen) {
      this.$_sidebarOpen = atomStorage({
        key: 'sidebar-open',
        initValue: true,
        syncDb: this.dep.syncDatabase,
        validator: T.Boolean,
        logger: this.logger,
      });
    }
    return this.$_sidebarOpen;
  }
}

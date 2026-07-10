import {
  atomStorage,
  atomStorageKey,
  BaseService,
  type BaseServiceContext,
  getEventSenderMetadata,
} from '@bangle.io/base-utils';
import type {
  ThemeConfig,
  ThemeManager,
} from '@bangle.io/color-scheme-manager';
import {
  DEFAULT_EDITOR_ENGINE,
  EDITOR_ENGINE_PREFERENCE_KEY,
  type EditorEngineId,
  isAssetLocationPreference,
  isEditorEngineId,
  SERVICE_NAME,
  SIDEBAR_DEFAULT_WIDTH,
} from '@bangle.io/constants';
import { T } from '@bangle.io/mini-js-utils';
import type {
  AssetLocationPreference,
  BaseDatabaseService,
  BaseSyncDatabaseService,
  ScopedEmitter,
} from '@bangle.io/types';
import type {
  AppAlertDialogProps,
  DialogSingleInputProps,
  DialogSingleSelectProps,
} from '@bangle.io/ui-components';
import { atom, type PrimitiveAtom } from 'jotai';
import { atomEffect } from 'jotai-effect';

type Route = 'omni-home' | 'omni-command' | 'omni-filtered';

const AssetLocationPreferenceValidator = {
  validate: isAssetLocationPreference,
  typeName: 'asset-location-preference',
};

const EditorEngineIdValidator = {
  validate: isEditorEngineId,
  typeName: 'editor-engine-id',
};

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
export class WorkbenchStateService extends BaseService {
  static deps = ['database', 'syncDatabase'] as const;

  private $_wideEditor: PrimitiveAtom<boolean> | undefined;
  private $_sidebarOpen: PrimitiveAtom<boolean> | undefined;
  private $_sidebarWidth: PrimitiveAtom<number> | undefined;
  private $_linkedMentionsCollapsed: PrimitiveAtom<boolean> | undefined;
  private $_showNoteFilesOnlyInSidebar: PrimitiveAtom<boolean> | undefined;
  private $_assetLocationPreference:
    | PrimitiveAtom<AssetLocationPreference>
    | undefined;
  private $_editorEngine: PrimitiveAtom<EditorEngineId> | undefined;

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
    super(SERVICE_NAME.workbenchStateService, context, dep);
    this.store.set(this.$themePref, this.config.themeManager.currentPreference);
  }

  hookMount() {
    this.addCleanup(
      // Keep the persisted engine atom mounted even though bootstrap, rather
      // than React, is its primary consumer. Sync-database notifications then
      // update this tab only after a durable preference write succeeds.
      this.store.sub(this.$editorEngine, () => {}),
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

  /**
   * Persists the selected editor engine before its sync-database notification
   * updates the mounted atom. A storage failure therefore leaves both the
   * current in-memory preference and the running editor unchanged.
   */
  public changeEditorEnginePreference(preference: EditorEngineId): boolean {
    const key = atomStorageKey(this.name, EDITOR_ENGINE_PREFERENCE_KEY);
    try {
      const result = this.dep.syncDatabase.updateEntry(
        key,
        () => ({ value: preference }),
        { tableName: 'sync' },
      );
      if (result.found && result.value === preference) {
        return true;
      }
      this.logger.error(
        'Editor engine preference write did not report the requested value',
        preference,
      );
    } catch (error) {
      this.logger.error('Unable to persist editor engine preference', error);
    }

    // A notification failure may throw after localStorage has already been
    // written. Confirm the durable value directly before deciding whether a
    // reload is safe; the stored preference, not the notification result, is
    // the source of truth for the next bootstrap.
    try {
      const persisted = this.dep.syncDatabase.getEntry(key, {
        tableName: 'sync',
      });
      return persisted.found && persisted.value === preference;
    } catch (error) {
      this.logger.error(
        'Unable to confirm the persisted editor engine preference',
        error,
      );
      return false;
    }
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
        serviceName: this.name,
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
        serviceName: this.name,
        key: 'sidebar-open',
        initValue: true,
        syncDb: this.dep.syncDatabase,
        validator: T.Boolean,
        logger: this.logger,
      });
    }
    return this.$_sidebarOpen;
  }

  get $sidebarWidth() {
    if (!this.$_sidebarWidth) {
      this.$_sidebarWidth = atomStorage({
        serviceName: this.name,
        key: 'sidebar-width',
        initValue: SIDEBAR_DEFAULT_WIDTH,
        syncDb: this.dep.syncDatabase,
        validator: {
          validate: (value): value is number =>
            typeof value === 'number' && Number.isFinite(value),
          typeName: 'finite-number',
        },
        logger: this.logger,
      });
    }
    return this.$_sidebarWidth;
  }

  get $linkedMentionsCollapsed() {
    if (!this.$_linkedMentionsCollapsed) {
      this.$_linkedMentionsCollapsed = atomStorage({
        serviceName: this.name,
        key: 'linked-mentions-collapsed',
        initValue: false,
        syncDb: this.dep.syncDatabase,
        validator: T.Boolean,
        logger: this.logger,
      });
    }
    return this.$_linkedMentionsCollapsed;
  }

  get $showNoteFilesOnlyInSidebar() {
    if (!this.$_showNoteFilesOnlyInSidebar) {
      this.$_showNoteFilesOnlyInSidebar = atomStorage({
        serviceName: this.name,
        key: 'show-note-files-only-in-sidebar',
        initValue: false,
        syncDb: this.dep.syncDatabase,
        validator: T.Boolean,
        logger: this.logger,
      });
    }
    return this.$_showNoteFilesOnlyInSidebar;
  }

  /**
   * The persisted editor-engine preference (plans/011). The composition root
   * reads the same sync-database entry synchronously before the container is
   * built, so a change only takes effect through a UI reload
   * (`command::ui:switch-editor-engine` handles the full switch protocol).
   */
  get $editorEngine() {
    if (!this.$_editorEngine) {
      this.$_editorEngine = atomStorage({
        serviceName: this.name,
        key: EDITOR_ENGINE_PREFERENCE_KEY,
        initValue: DEFAULT_EDITOR_ENGINE,
        syncDb: this.dep.syncDatabase,
        validator: EditorEngineIdValidator,
        logger: this.logger,
      });
    }
    return this.$_editorEngine;
  }

  get $assetLocationPreference() {
    if (!this.$_assetLocationPreference) {
      this.$_assetLocationPreference = atomStorage({
        serviceName: this.name,
        key: 'asset-location-preference',
        initValue: 'assets-folder',
        syncDb: this.dep.syncDatabase,
        validator: AssetLocationPreferenceValidator,
        logger: this.logger,
      });
    }
    return this.$_assetLocationPreference;
  }
}

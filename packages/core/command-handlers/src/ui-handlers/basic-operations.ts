import { throwAppError } from '@bangle.io/base-utils';
import { Sun } from 'lucide-react';
import { c, getCtx } from '../helper';

export const basicOperationsHandlers = [
  c('command::ui:toggle-sidebar', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    store.set(workbenchState.$sidebarOpen, (prev) => !prev);
  }),

  c(
    'command::ui:toggle-omni-search',
    ({ workbenchState }, { prefill }, key) => {
      const { store } = getCtx(key);
      store.set(workbenchState.$openOmniSearch, (prev) => !prev);
      if (prefill) {
        store.set(workbenchState.$omniSearchInput, prefill);
      }
    },
  ),

  c('command::ui:switch-theme', ({ workbenchState }, _, key) => {
    const { store, dispatch } = getCtx(key);
    const currentPref = store.get(workbenchState.$themePref);
    const system = 'system' as const;
    const light = 'light' as const;
    const dark = 'dark' as const;

    store.set(workbenchState.$singleSelectDialog, () => {
      return {
        dialogId: 'dialog::change-theme-pref-dialog',
        title: t.app.dialogs.changeTheme.title,
        description: t.app.dialogs.changeTheme.searchPlaceholder,
        searchPlaceholder: t.app.dialogs.changeTheme.searchPlaceholder,
        groupLabel: t.app.dialogs.changeTheme.groupLabel,
        emptyMessage: t.app.dialogs.changeTheme.emptyMessage,
        options: [
          {
            title: t.app.dialogs.changeTheme.options.system,
            id: 'system',
            active: currentPref === system,
          },
          {
            title: t.app.dialogs.changeTheme.options.light,
            id: 'light',
            active: currentPref === light,
          },
          {
            title: t.app.dialogs.changeTheme.options.dark,
            id: 'dark',
            active: currentPref === dark,
          },
        ],
        Icon: Sun,
        onSelect: (option) => {
          if (
            option.id === system ||
            option.id === light ||
            option.id === dark
          ) {
            workbenchState.changeThemePreference(option.id);
            dispatch('command::ui:focus-editor', null);
          }
        },
      };
    });
  }),

  c('command::ui:reload-app', ({ workbenchState }) => {
    workbenchState.reloadUi();
  }),

  c('command::ui:open-settings', ({ navigation }) => {
    navigation.goSettingsPage('settings-general');
  }),

  c('command::ui:open-settings-general', ({ navigation }) => {
    navigation.goSettingsPage('settings-general');
  }),

  c('command::ui:open-settings-workspaces', ({ navigation }) => {
    navigation.goSettingsPage('settings-workspaces');
  }),

  c(
    'command::ui:toggle-all-files',
    ({ workbenchState }, { prefillInput }, key) => {
      const { store } = getCtx(key);
      store.set(workbenchState.$openAllFiles, (prev) => !prev);
      if (prefillInput) {
        store.set(workbenchState.$allFilesSearchInput, prefillInput);
      }
    },
  ),

  c(
    'command::ui:toggle-wide-editor',
    ({ workbenchState, workspaceState }, _, key) => {
      const { store } = getCtx(key);
      const currentWsPath = store.get(workspaceState.$currentWsPath);
      if (!currentWsPath) {
        throwAppError(
          'error::workspace:not-opened',
          t.app.errors.workspace.noNoteOpenCannotToggleWideEditor,
          {},
        );
      }
      // Note is open, toggle the wide editor
      store.set(workbenchState.$wideEditor, (prev) => !prev);
    },
  ),

  c(
    'command::ui:focus-editor',
    ({ workspaceState, pmEditorService }, _, key) => {
      const { store } = getCtx(key);
      const currentWsPath = store.get(workspaceState.$currentWsPath);

      if (!currentWsPath) {
        return;
      }

      pmEditorService.focusEditor();
    },
  ),

  c('command::ui:toggle-heading-collapse', ({ pmEditorService }) => {
    pmEditorService.toggleHeadingCollapse();
  }),

  c('command::ui:uncollapse-all-headings', ({ pmEditorService }) => {
    pmEditorService.uncollapseAllHeadings();
  }),

  c('command::ui:collapse-all-headings-1', ({ pmEditorService }) => {
    pmEditorService.collapseAllHeadings(1);
  }),

  c('command::ui:collapse-all-headings-2', ({ pmEditorService }) => {
    pmEditorService.collapseAllHeadings(2);
  }),

  c('command::ui:collapse-all-headings-3', ({ pmEditorService }) => {
    pmEditorService.collapseAllHeadings(3);
  }),
];

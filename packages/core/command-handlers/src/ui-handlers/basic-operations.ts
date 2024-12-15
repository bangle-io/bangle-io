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
    const { store } = getCtx(key);
    const currentPref = store.get(workbenchState.$themePref);
    const system = 'system' as const;
    const light = 'light' as const;
    const dark = 'dark' as const;

    store.set(workbenchState.$singleSelectDialog, () => {
      return {
        dialogId: 'dialog::change-theme-pref-dialog',
        placeholder: 'Select a theme preference',
        badgeText: 'Change Theme',
        groupHeading: 'Themes',
        emptyMessage: 'No themes available',
        options: [
          {
            title: 'System',
            id: 'system',
            active: currentPref === system,
          },
          { title: 'Light', id: 'light', active: currentPref === light },
          { title: 'Dark', id: 'dark', active: currentPref === dark },
        ],
        Icon: Sun,
        onSelect: (option) => {
          if (
            option.id === system ||
            option.id === light ||
            option.id === dark
          ) {
            workbenchState.changeThemePreference(option.id);
          }
        },
      };
    });
  }),

  c('command::ui:reload-app', ({ workbenchState }) => {
    workbenchState.reloadUi();
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
      const currentWsPath = store.get(workspaceState.$wsPath);
      if (!currentWsPath) {
        throwAppError(
          'error::workspace:not-opened',
          'No note is currently open, cannot toggle wide editor.',
          {},
        );
      }
      // Note is open, toggle the wide editor
      store.set(workbenchState.$wideEditor, (prev) => !prev);
    },
  ),
];

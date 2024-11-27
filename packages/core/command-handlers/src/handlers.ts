import { BaseError, throwAppError } from '@bangle.io/base-utils';
import { filePathToWsPath, resolvePath } from '@bangle.io/ws-path';
import { c } from './helper';

import type { ThemePreference } from '@bangle.io/types';
import { Sun, Trash2 } from 'lucide-react';
import { validateInputPath } from './utils';

export const commandHandlers = [
  c('command::ui:test-no-use', (_) => {}),

  c(
    'command::ws:new-note-from-input',
    ({ fileSystem, navigation }, { inputPath }) => {
      validateInputPath(inputPath);

      const { wsName } = navigation.resolveAtoms();

      if (!wsName) {
        throwAppError('error::ws-path:create-new-note', 'No workspace open', {
          invalidWsPath: inputPath,
        });
      }
      if (!inputPath.endsWith('.md')) {
        inputPath = `${inputPath}.md`;
      }
      const newWsPath = filePathToWsPath(wsName, inputPath);

      const { fileNameWithoutExt } = resolvePath(newWsPath);

      void fileSystem.createFile(
        newWsPath,
        new File(
          [`I am content of ${fileNameWithoutExt}`],
          fileNameWithoutExt,
          {
            type: 'text/plain',
          },
        ),
      );
    },
  ),

  c('command::ws:go-workspace', ({ navigation }, { wsName }) => {
    navigation.goWorkspace(wsName);
  }),
  c('command::ws:go-ws-path', ({ navigation }, { wsPath }) => {
    navigation.goWsPath(wsPath);
  }),

  c('command::ui:toggle-sidebar', ({ workbenchState }, _, { store }) => {
    store.set(workbenchState.$sidebarOpen, (prev) => !prev);
  }),

  c('command::ui:new-workspace-dialog', ({ workbenchState }, _, { store }) => {
    store.set(workbenchState.$openWsDialog, (prev) => !prev);
  }),

  c('command::ui:new-note-dialog', ({ workbenchState }, __, { store }) => {
    store.set(workbenchState.$newNoteDialog, (prev) => !prev);
  }),

  c('command::ui:toggle-omni-search', ({ workbenchState }, _, { store }) => {
    store.set(workbenchState.$openOmniSearch, (prev) => !prev);
  }),

  c(
    'command::ui:change-theme-pref-dialog',
    ({ workbenchState }, _, { store }) => {
      const currentPref = store.get(workbenchState.$themePref);
      const system = 'system' satisfies ThemePreference;
      const light = 'light' satisfies ThemePreference;
      const dark = 'dark' satisfies ThemePreference;

      store.set(workbenchState.$singleSelectDialog, () => {
        return {
          dialogId: 'change-theme-pref-dialog',
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
            } else {
              throw new BaseError({ message: 'Invalid theme preference' });
            }
          },
        };
      });
    },
  ),

  c(
    'command::ui:delete-ws-path-dialog',
    ({ workbenchState, workspaceState, fileSystem }, _, { store }) => {
      const wsPaths = store.get(workspaceState.$wsPaths);
      const wsName = store.get(workspaceState.$wsName);

      if (!wsName || wsPaths?.length === 0) {
        throwAppError(
          'error::workspace:not-allowed',
          'No notes provided or available to delete',
          {
            wsName,
          },
        );
      }

      store.set(workbenchState.$singleSelectDialog, () => {
        return {
          dialogId: 'delete-ws-path-dialog',
          placeholder: 'Select or type a note to delete',
          badgeText: 'Delete Note',
          badgeTone: 'destructive',
          groupHeading: 'Notes',
          emptyMessage: 'No notes found',
          options: wsPaths.map((path) => ({
            title: resolvePath(path).fileName,
            id: path,
          })),
          Icon: Trash2,
          onSelect: (option) => {
            const fileName = resolvePath(option.id).fileNameWithoutExt;
            if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
              fileSystem.deleteFile(option.id);
            }
          },
        };
      });
    },
  ),
];

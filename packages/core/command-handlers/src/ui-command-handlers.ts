import { BaseError, expectType, throwAppError } from '@bangle.io/base-utils';
import type { ThemePreference } from '@bangle.io/types';
import {
  appendNoteExtension,
  assertSplitWsPath,
  assertedResolvePath,
  filePathToWsPath,
  pathJoin,
} from '@bangle.io/ws-path';
import { Briefcase, FilePlus, Sun, Trash2 } from 'lucide-react';
import { c, getCtx } from './helper';
import { validateInputPath } from './utils';

export const uiCommandHandlers = [
  // GROUP: TEST
  c(
    'command::ui:test-no-use',
    ({ workspaceOps }, { workspaceType, wsName }, key) => {
      getCtx(key);

      expectType<string, typeof workspaceType>(workspaceType);
      expectType<string, typeof workspaceOps.name>(workspaceOps.name);
      expectType<string, typeof wsName>(wsName);
      expectType<{ key: 'command::ui:test-no-use' }, typeof key>(key);
    },
  ),

  // GROUP: BASIC UI OPERATIONS
  c('command::ui:toggle-sidebar', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    store.set(workbenchState.$sidebarOpen, (prev) => !prev);
  }),

  c('command::ui:toggle-search', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    store.set(workbenchState.$openOmniSearch, (prev) => !prev);
  }),

  c('command::ui:switch-theme', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    const currentPref = store.get(workbenchState.$themePref);
    const system = 'system' satisfies ThemePreference;
    const light = 'light' satisfies ThemePreference;
    const dark = 'dark' satisfies ThemePreference;

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
          } else {
            throw new BaseError({ message: 'Invalid theme preference' });
          }
        },
      };
    });
  }),

  // GROUP: NOTES MANAGEMENT
  c(
    'command::ui:create-note-dialog',
    ({ workbenchState }, { prefillName }, key) => {
      const { store, dispatch } = getCtx(key);
      store.set(workbenchState.$singleInputDialog, () => {
        return {
          dialogId: 'dialog::new-note-dialog',
          placeholder: 'Input a note name',
          badgeText: 'Create Note',
          option: {
            id: 'new-note-dialog',
            title: 'Create',
          },
          onSelect: (input) => {
            dispatch('command::ws:new-note-from-input', {
              inputPath: input.trim(),
            });
          },
          Icon: FilePlus,
          initialSearch: prefillName,
        };
      });
    },
  ),

  c(
    'command::ui:delete-note-dialog',
    ({ workbenchState, workspaceState }, { wsPath }, key) => {
      const { store, dispatch } = getCtx(key);
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
          dialogId: 'dialog::delete-ws-path-dialog',
          placeholder: 'Select or type a note to delete',
          badgeText: 'Delete Note',
          badgeTone: 'destructive',
          groupHeading: 'Notes',
          emptyMessage: 'No notes found',
          options: wsPaths.map((path) => ({
            title: assertSplitWsPath(path).filePath,
            id: path,
          })),
          Icon: Trash2,
          initialSearch: wsPath
            ? assertSplitWsPath(wsPath).filePath
            : undefined,
          onSelect: (option) => {
            const fileName = assertedResolvePath(option.id).fileNameWithoutExt;
            if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
              dispatch('command::ws:delete-ws-path', { wsPath: option.id });
            }
          },
        };
      });
    },
  ),

  c(
    'command::ui:rename-note-dialog',
    ({ workspaceState, workbenchState }, { wsPath }, key) => {
      const { store, dispatch } = getCtx(key);
      const oldWsPath = wsPath || store.get(workspaceState.$wsPath);

      if (!oldWsPath) {
        throwAppError('error::workspace:not-opened', 'No workspace is opened', {
          wsPath,
        });
      }

      const { wsName, fileNameWithoutExt, dirPath } =
        assertedResolvePath(oldWsPath);

      store.set(workbenchState.$singleInputDialog, () => {
        return {
          dialogId: 'dialog::rename-note-dialog',
          placeholder: 'Provide a new name',
          badgeText: `Renaming "${fileNameWithoutExt}"`,
          initialSearch: fileNameWithoutExt,
          Icon: FilePlus,
          option: {
            id: 'rename-note-dialog',
            title: 'Confirm name change',
          },
          onSelect: (input) => {
            if (!input) {
              throwAppError(
                'error::file:invalid-operation',
                'Invalid note name provided',
                {
                  oldWsPath: oldWsPath,
                  newWsPath: input,
                  operation: 'rename',
                },
              );
            }

            const newName = appendNoteExtension(input.trim());

            validateInputPath(newName);

            const newWsPath = filePathToWsPath({
              wsName,
              inputPath: pathJoin(dirPath, newName),
            });
            assertSplitWsPath(newWsPath);

            dispatch('command::ws:rename-ws-path', {
              newWsPath,
              wsPath: oldWsPath,
            });
          },
        };
      });
    },
  ),

  c(
    'command::ui:move-note-dialog',
    ({ workspaceState, workbenchState }, { wsPath }, key) => {
      const { store, dispatch } = getCtx(key);
      const oldWsPath = wsPath || store.get(workspaceState.$wsPath);
      const existingWsPaths = store.get(workspaceState.$wsPaths);

      const dirPaths = [
        ...new Set(
          existingWsPaths.map((path) => {
            const { dirPath } = assertedResolvePath(path);
            return dirPath;
          }),
        ),
      ];

      if (!oldWsPath) {
        throwAppError('error::workspace:not-opened', 'No workspace is opened', {
          wsPath,
        });
      }
      const { wsName, fileName, fileNameWithoutExt, dirPath } =
        assertedResolvePath(oldWsPath);

      const isAtRoot = dirPath === '';

      const options = dirPaths.map((dirPath) => ({
        title: dirPath,
        id: dirPath,
      }));

      const ROOT_ID = '<{bangle_root}>';

      if (!isAtRoot) {
        options.push({
          title: '/ Root',
          id: ROOT_ID,
        });
      }

      store.set(workbenchState.$singleSelectDialog, () => {
        return {
          dialogId: 'dialog::move-note-dialog',
          placeholder: 'Select a path to move the note',
          badgeText: `Move "${fileNameWithoutExt}"`,
          emptyMessage: 'No directories found',
          options,
          Icon: Briefcase,
          groupHeading: 'Directories',
          onSelect: (selectedDir) => {
            const newDirPath = selectedDir.id;

            const newPath =
              newDirPath === ROOT_ID
                ? fileName
                : pathJoin(newDirPath, fileName);

            validateInputPath(newPath);

            const newWsPath = filePathToWsPath({
              wsName,
              inputPath: newPath,
            });
            assertedResolvePath(newWsPath);

            dispatch('command::ws:rename-ws-path', {
              newWsPath,
              wsPath: oldWsPath,
            });
          },
        };
      });
    },
  ),

  c('command::ui:quick-new-note', ({ workspaceState }, _, key) => {
    const { store, dispatch } = getCtx(key);
    const wsPaths = store.get(workspaceState.$wsPaths) || [];

    const untitledNotes = wsPaths
      .map((path) => assertedResolvePath(path).fileNameWithoutExt)
      .filter((name) => name.startsWith('untitled-'))
      .map((name) => {
        const num = Number.parseInt(name.replace('untitled-', ''));
        return Number.isNaN(num) ? 0 : num;
      });

    const nextNum =
      untitledNotes.length > 0 ? Math.max(...untitledNotes) + 1 : 1;
    const newNoteName = `untitled-${nextNum}`;

    dispatch('command::ws:new-note-from-input', {
      inputPath: newNoteName,
    });
  }),

  // GROUP: WORKSPACE MANAGEMENT
  c('command::ui:create-workspace-dialog', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    store.set(workbenchState.$openWsDialog, (prev) => !prev);
  }),

  c(
    'command::ui:switch-workspace',
    ({ workbenchState, workspaceState, navigation }, _, key) => {
      const { store } = getCtx(key);
      const workspaces = store.get(workspaceState.$workspaces);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      store.set(workbenchState.$singleSelectDialog, () => {
        return {
          dialogId: 'dialog::switch-workspace-dialog',
          placeholder: 'Select a workspace to switch',
          badgeText: 'Switch Workspace',
          groupHeading: 'Workspaces',
          emptyMessage: 'No workspaces found',
          options: workspaces
            .sort((a, b) => {
              const aRecent = new Date(a.lastModified) >= sevenDaysAgo;
              const bRecent = new Date(b.lastModified) >= sevenDaysAgo;

              if (aRecent && !bRecent) return -1;
              if (!aRecent && bRecent) return 1;
              if (aRecent && bRecent) {
                return (
                  new Date(b.lastModified).getTime() -
                  new Date(a.lastModified).getTime()
                );
              }
              return a.name.localeCompare(b.name);
            })
            .map((ws) => ({
              title: ws.name,
              id: ws.type + ws.name,
            })),
          Icon: Briefcase,
          onSelect: (option) => {
            navigation.goWorkspace(option.title);
          },
        };
      });
    },
  ),

  c(
    'command::ui:delete-workspace-dialog',
    ({ workbenchState, workspaceState }, _, key) => {
      const { store, dispatch } = getCtx(key);
      const workspaces = store.get(workspaceState.$workspaces);

      store.set(workbenchState.$singleSelectDialog, () => {
        return {
          dialogId: 'dialog::delete-workspace-dialog',
          placeholder: 'Select a workspace to delete',
          badgeText: 'Delete Workspace',
          badgeTone: 'destructive',
          groupHeading: 'Workspaces',
          emptyMessage: 'No workspaces found',
          options: workspaces.map((ws) => ({
            title: ws.name,
            id: ws.type + ws.name,
          })),
          Icon: Trash2,
          onSelect: (option) => {
            const wsName = option.title;
            if (
              wsName &&
              confirm(
                `Are you sure you want to delete the workspace "${wsName}"? This action cannot be undone.`,
              )
            ) {
              dispatch('command::ws:delete-workspace', { wsName });
            }
          },
        };
      });
    },
  ),
];

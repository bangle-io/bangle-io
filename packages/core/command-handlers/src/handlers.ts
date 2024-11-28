import { BaseError, expectType, throwAppError } from '@bangle.io/base-utils';
import {
  appendNoteExtension,
  filePathToWsPath,
  pathJoin,
  removeExtension,
  resolvePath,
} from '@bangle.io/ws-path';
import { c, getCtx } from './helper';

import type { ThemePreference } from '@bangle.io/types';
import { Briefcase, FilePlus, Sun, Trash2 } from 'lucide-react';
import { validateInputPath } from './utils';

export const commandHandlers = [
  c(
    'command::ui:test-no-use',
    ({ workspaceOps }, { workspaceType, wsName }, key) => {
      const { dispatch } = getCtx(key);

      expectType<string, typeof workspaceType>(workspaceType);
      expectType<string, typeof workspaceOps.name>(workspaceOps.name);
      expectType<string, typeof wsName>(wsName);
      expectType<{ key: 'command::ui:test-no-use' }, typeof key>(key);

      dispatch('command::ui:delete-ws-path-dialog', {
        wsPath: undefined,
      });

      dispatch('command::ws:new-note', {
        wsPath: 'test:note.md',
      });
    },
  ),

  c('command::ui:toggle-sidebar', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    store.set(workbenchState.$sidebarOpen, (prev) => !prev);
  }),

  c('command::ui:new-workspace-dialog', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    store.set(workbenchState.$openWsDialog, (prev) => !prev);
  }),

  c(
    'command::ui:new-note-dialog',
    ({ workbenchState }, { prefillName }, key) => {
      const { store, dispatch } = getCtx(key);
      store.set(workbenchState.$singleInputDialog, () => {
        return {
          dialogId: 'new-note-dialog',
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

  c('command::ui:toggle-omni-search', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    store.set(workbenchState.$openOmniSearch, (prev) => !prev);
  }),

  c('command::ui:change-theme-pref-dialog', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
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
  }),

  c(
    'command::ui:delete-ws-path-dialog',
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
          dialogId: 'delete-ws-path-dialog',
          placeholder: 'Select or type a note to delete',
          badgeText: 'Delete Note',
          badgeTone: 'destructive',
          groupHeading: 'Notes',
          emptyMessage: 'No notes found',
          options: wsPaths.map((path) => ({
            title: resolvePath(path).filePath,
            id: path,
          })),
          Icon: Trash2,
          initialSearch: wsPath ? resolvePath(wsPath).filePath : undefined,
          onSelect: (option) => {
            const fileName = resolvePath(option.id).fileNameWithoutExt;
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

      const { wsName, fileNameWithoutExt, dirPath } = resolvePath(oldWsPath);

      store.set(workbenchState.$singleInputDialog, () => {
        return {
          dialogId: 'rename-note-dialog',
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

            const newName = appendNoteExtension(removeExtension(input.trim()));

            validateInputPath(newName);

            const newWsPath = filePathToWsPath({
              wsName,
              inputPath: pathJoin(dirPath, newName),
            });
            resolvePath(newWsPath, false);

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
    'command::ui:switch-workspace-dialog',
    ({ workbenchState, workspaceState, navigation }, _, key) => {
      const { store } = getCtx(key);
      const workspaces = store.get(workspaceState.$workspaces);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      store.set(workbenchState.$singleSelectDialog, () => {
        return {
          dialogId: 'switch-workspace-dialog',
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
          dialogId: 'delete-workspace-dialog',
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

  c(
    'command::ui:move-note-dialog',
    ({ workspaceState, workbenchState }, { wsPath }, key) => {
      const { store, dispatch } = getCtx(key);
      const oldWsPath = wsPath || store.get(workspaceState.$wsPath);
      const existingWsPaths = store.get(workspaceState.$wsPaths);

      const dirPaths = [
        ...new Set(
          existingWsPaths.map((path) => {
            const { dirPath } = resolvePath(path);
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
        resolvePath(oldWsPath);

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
          dialogId: 'move-note-dialog',
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
            resolvePath(newWsPath, false);

            dispatch('command::ws:rename-ws-path', {
              newWsPath,
              wsPath: oldWsPath,
            });
          },
        };
      });
    },
  ),
  // workspace handlers
  c(
    'command::ws:new-note-from-input',
    ({ fileSystem, navigation, workspaceState }, { inputPath }, key) => {
      validateInputPath(inputPath);
      const { store } = getCtx(key);

      const { wsName } = navigation.resolveAtoms();

      if (!wsName) {
        throwAppError('error::ws-path:create-new-note', 'No workspace open', {
          invalidWsPath: inputPath,
        });
      }
      if (!inputPath.endsWith('.md')) {
        inputPath = `${inputPath}.md`;
      }
      const newWsPath = filePathToWsPath({ wsName, inputPath });

      const existingWsPaths = store.get(workspaceState.$wsPaths);
      if (existingWsPaths.includes(newWsPath)) {
        throwAppError(
          'error::file:invalid-note-path',
          'Note with the given name already already exists',
          {
            invalidWsPath: newWsPath,
          },
        );
      }

      const { fileNameWithoutExt } = resolvePath(newWsPath);

      void fileSystem
        .createFile(
          newWsPath,
          new File(
            [`I am content of ${fileNameWithoutExt}`],
            fileNameWithoutExt,
            {
              type: 'text/plain',
            },
          ),
        )
        .then(() => {
          navigation.goWsPath(newWsPath);
        });
    },
  ),

  c('command::ws:go-workspace', ({ navigation }, { wsName }) => {
    navigation.goWorkspace(wsName);
  }),
  c('command::ws:go-ws-path', ({ navigation }, { wsPath }) => {
    navigation.goWsPath(wsPath);
  }),

  c(
    'command::ws:delete-workspace',
    ({ workspaceOps, navigation }, { wsName }) => {
      if (navigation.resolveAtoms().wsName === wsName) {
        navigation.goHome();
      }
      workspaceOps.deleteWorkspaceInfo(wsName);
    },
  ),

  c('command::ws:delete-ws-path', ({ fileSystem, navigation }, { wsPath }) => {
    if (navigation.resolveAtoms().wsPath === wsPath) {
      navigation.goWorkspace();
    }
    fileSystem.deleteFile(wsPath);
  }),

  c(
    'command::ws:rename-ws-path',
    ({ fileSystem, navigation }, { wsPath, newWsPath }) => {
      const { wsName } = resolvePath(wsPath, false);
      const { wsName: wsNameNew } = resolvePath(newWsPath, false);

      if (wsName !== wsNameNew) {
        throwAppError(
          'error::file:invalid-operation',
          'Cannot rename note to a different workspace',
          {
            operation: 'rename',
            oldWsPath: wsPath,
            newWsPath,
          },
        );
      }

      const needsRedirect = navigation.resolveAtoms().wsPath === wsPath;
      if (needsRedirect) {
        navigation.goWorkspace();
      }

      void fileSystem
        .renameFile({
          oldWsPath: wsPath,
          newWsPath,
        })
        .then(() => {
          if (needsRedirect) {
            navigation.goWsPath(newWsPath);
          }
        });
    },
  ),
];

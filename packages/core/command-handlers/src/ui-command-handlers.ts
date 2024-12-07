// packages/core/command-handlers/src/ui-command-handlers.ts
import { requestNativeBrowserFSPermission } from '@bangle.io/baby-fs';
import {
  BaseError,
  expectType,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import type { ThemePreference } from '@bangle.io/types';
import { toast } from '@bangle.io/ui-components';
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

  c('command::ui:toggle-omni-search', ({ workbenchState }, _, key) => {
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
          hints: ['Press Enter or Click to delete'],
          initialSearch: wsPath
            ? assertSplitWsPath(wsPath).filePath
            : undefined,
          onSelect: (option) => {
            const fileName = assertedResolvePath(option.id).fileNameWithoutExt;

            store.set(workbenchState.$alertDialog, () => {
              return {
                dialogId: 'dialog::alert',
                title: 'Confirm Delete',
                tone: 'destructive',
                description: `Are you sure you want to delete "${fileName}"?`,
                continueText: 'Delete',
                onContinue: () => {
                  dispatch('command::ws:delete-ws-path', { wsPath: option.id });
                },
                onCancel: () => {},
              };
            });
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
      ]
        // filter out root
        .filter((dirPath) => dirPath !== '');

      if (!oldWsPath) {
        throwAppError('error::workspace:not-opened', 'No workspace is opened', {
          wsPath,
        });
      }
      const {
        wsName,
        fileNameWithoutExt,
        dirPath: oldDirPath,
      } = assertedResolvePath(oldWsPath);

      const isAtRoot = oldDirPath === '';

      const options = dirPaths

        .filter((dirPath) => dirPath !== oldDirPath)
        .map((dirPath) => ({
          title: dirPath,
          id: dirPath,
        }));

      const ROOT_ID = '<{bangle_root}>';

      if (!isAtRoot) {
        options.push({
          title: '/',
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
          hints: [
            'Press Enter or Click',
            'Tip: Try dragging a note in the sidebar',
          ],
          onSelect: (selectedDir) => {
            let newDirPath = selectedDir.id;
            if (newDirPath === ROOT_ID) {
              newDirPath = '';
            } else {
              validateInputPath(newDirPath);
            }

            dispatch('command::ws:move-ws-path', {
              wsPath: oldWsPath,
              destDirWsPath: filePathToWsPath({
                wsName,
                inputPath: newDirPath,
              }),
            });
          },
        };
      });
    },
  ),

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
              id: `${ws.type}-${ws.name}`,
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
            id: `${ws.type}-${ws.name}`,
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
    'command::ui:create-directory-dialog',
    ({ workbenchState, workspaceState }, _, key) => {
      const { store, dispatch } = getCtx(key);
      const wsName = store.get(workspaceState.$wsName);

      if (!wsName) {
        throwAppError(
          'error::workspace:not-opened',
          'No workspace is opened',
          {},
        );
      }

      store.set(workbenchState.$singleInputDialog, () => {
        return {
          dialogId: 'dialog::new-directory-dialog',
          placeholder: 'Input directory name',
          badgeText: 'Create Directory',
          option: {
            id: 'new-directory-dialog',
            title: 'Create',
          },
          onSelect: (_input) => {
            const input = _input.trim();
            validateInputPath(input);
            dispatch('command::ws:create-directory', {
              dirWsPath: filePathToWsPath({
                wsName,
                inputPath: input,
              }),
            });
          },
          Icon: FilePlus,
        };
      });
    },
  ),

  c(
    'command::ui:native-fs-auth',
    (
      { workspaceOps, navigation, workbenchState, editorService },
      { wsName },
      key,
    ) => {
      const { store } = getCtx(key);

      workspaceOps.getWorkspaceMetadata(wsName).then(({ rootDirHandle }) => {
        if (!rootDirHandle) {
          throwAppError(
            'error::workspace:invalid-metadata',
            `Invalid workspace metadata for ${wsName}. Missing root dir handle`,
            { wsName },
          );
        }

        let attempt = 0;

        const failAndGoToHome = () => {
          toast.error('Permission not granted', {
            duration: 5000,
            cancel: {
              label: 'Dismiss',
              onClick: () => {},
            },
          });
          navigation.goHome();
        };

        const onNotGranted = () => {
          queueMicrotask(() => {
            if (attempt++ > 2) {
              failAndGoToHome();
              return;
            }
            store.set(workbenchState.$alertDialog, {
              dialogId: 'dialog::workspace:native-fs-auth-needed',
              title: 'Grant permission?',
              description: `That didn't work. Bangle.io needs your permission to access "${wsName}"`,
              continueText: 'Try Again',
              onContinue,
              onCancel: () => {
                failAndGoToHome();
              },
            });
          });
        };

        const onContinue = async () => {
          const granted = await requestNativeBrowserFSPermission(rootDirHandle);

          if (!granted) {
            onNotGranted();
            return;
          }

          editorService.onNativeFsAuthSuccess(wsName);
          navigation.goWorkspace(wsName, { skipIfAlreadyThere: true });
        };

        store.set(workbenchState.$alertDialog, {
          dialogId: 'dialog::workspace:native-fs-auth-needed',
          title: 'Grant permission?',
          description: `Bangle.io needs your permission to access "${wsName}"`,
          continueText: 'Grant',
          onContinue,
          onCancel: () => {
            failAndGoToHome();
          },
        });
      });
    },
  ),
];

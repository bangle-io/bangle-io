import { throwAppError } from '@bangle.io/base-utils';
import {
  appendNoteExtension,
  assertSplitWsPath,
  assertedResolvePath,
  filePathToWsPath,
  pathJoin,
} from '@bangle.io/ws-path';
import { FilePlus, Trash2 } from 'lucide-react';
import { c, getCtx } from '../helper';
import { validateInputPath } from '../utils';

export const noteManagementHandlers = [
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

      if (!wsName || !wsPaths || wsPaths.length === 0) {
        throwAppError(
          'error::workspace:no-notes-found',
          'No notes provided or available to delete',
          { wsName },
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

      if (!oldWsPath) {
        throwAppError('error::workspace:not-opened', 'No workspace is opened', {
          wsPath,
        });
      }

      const dirPaths = [
        ...new Set(
          (existingWsPaths || []).map((path) => {
            const { dirPath } = assertedResolvePath(path);
            return dirPath;
          }),
        ),
      ].filter((dirPath) => dirPath !== '');

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
          Icon: FilePlus,
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
];

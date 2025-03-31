import { throwAppError } from '@bangle.io/base-utils';
import { WsPath } from '@bangle.io/ws-path';
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
            title: path.filePath,
            id: path.wsPath,
          })),
          Icon: Trash2,
          hints: ['Press Enter or Click to delete'],
          initialSearch: wsPath ? WsPath.fromString(wsPath).path : undefined,
          onSelect: (option) => {
            const wsPath = WsPath.fromString(option.id);
            const fileName = wsPath.asFile()?.fileNameWithoutExtension;

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
      const { data: oldWsPath } = WsPath.safeParse(
        wsPath || store.get(workspaceState.$currentWsPath) || '',
      );

      if (!oldWsPath) {
        throwAppError('error::workspace:not-opened', 'No workspace is opened', {
          wsPath,
        });
      }
      const fileOldWsPath = oldWsPath.asFile();

      if (!fileOldWsPath) {
        throwAppError(
          'error::file:invalid-note-path',
          'Invalid note path provided',
          {
            invalidWsPath: oldWsPath.wsPath,
          },
        );
      }

      store.set(workbenchState.$singleInputDialog, () => {
        return {
          dialogId: 'dialog::rename-note-dialog',
          placeholder: 'Provide a new name',
          badgeText: `Renaming "${fileOldWsPath.fileNameWithoutExtension}"`,
          initialSearch: fileOldWsPath.fileNameWithoutExtension,
          Icon: FilePlus,
          option: {
            id: 'rename-note-dialog',
            title: 'Confirm name change',
          },
          onSelect: (input) => {
            const trimmedInput = input.trim();
            if (!trimmedInput) {
              throwAppError(
                'error::file:invalid-operation',
                'Invalid note name provided',
                {
                  oldWsPath: oldWsPath.wsPath,
                  newWsPath: input,
                  operation: 'rename',
                },
              );
            }

            const newName =
              trimmedInput +
              (trimmedInput.endsWith(WsPath.DEFAULT_NOTE_EXTENSION)
                ? ''
                : WsPath.DEFAULT_NOTE_EXTENSION);

            const parentDirPath = fileOldWsPath.getParent();

            // Construct the relative path for validation
            const relativeNewPath = parentDirPath
              ? WsPath.pathJoin(parentDirPath.path, newName)
              : newName;

            // Validate the constructed relative path
            validateInputPath(relativeNewPath);

            if (!parentDirPath) {
              // This case should ideally be handled by validateInputPath if newName contains '/',
              // but we keep the check for clarity and robustness.
              // If parentDirPath is null, it means the original file was at the root.
              // We construct the new path directly from the newName.
              if (newName.includes('/')) {
                // Prevent creating subdirectories during rename implicitly
                throwAppError(
                  'error::file:invalid-operation',
                  'Cannot move file during rename operation. Use move command.',
                  {
                    oldWsPath: oldWsPath.wsPath,
                    newWsPath: input,
                    operation: 'rename',
                  },
                );
              }
            }

            const newWsPath = fileOldWsPath.replaceFileName(newName);

            dispatch('command::ws:rename-ws-path', {
              newWsPath: newWsPath.wsPath,
              wsPath: oldWsPath.wsPath,
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
      const { data: oldWsPath } = WsPath.safeParse(
        wsPath || store.get(workspaceState.$currentWsPath) || '',
      );
      const existingWsPaths = store.get(workspaceState.$wsPaths);

      if (!oldWsPath) {
        throwAppError('error::workspace:not-opened', 'No workspace is opened', {
          wsPath,
        });
      }

      const dirPaths = [
        ...new Set(
          (existingWsPaths || []).map((path) => {
            const wsPath = WsPath.fromString(path.wsPath);
            const parent = wsPath.getParent();
            return parent ? parent.path : '';
          }),
        ),
      ].filter((dirPath) => dirPath !== '');

      const filePath = WsPath.assertFile(oldWsPath.wsPath);
      const oldDirPath = filePath.getParent()?.path || '';
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
          badgeText: `Move "${filePath.fileNameWithoutExtension}"`,
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
              wsPath: oldWsPath.wsPath,
              destDirWsPath: WsPath.fromParts(oldWsPath.wsName, newDirPath)
                .wsPath,
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
              dirWsPath: WsPath.fromParts(wsName, input).wsPath,
            });
          },
          Icon: FilePlus,
        };
      });
    },
  ),
];

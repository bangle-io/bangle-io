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
          placeholder: t.app.dialogs.createNote.placeholder,
          badgeText: t.app.dialogs.createNote.badgeText,
          option: {
            id: 'new-note-dialog',
            title: t.app.dialogs.createNote.optionTitle,
          },
          onSelect: (input) => {
            dispatch('command::ws:new-note-from-input', {
              inputPath: input.trim(),
            });
            dispatch('command::ui:focus-editor', null);
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
          t.app.errors.workspace.noNotesToDelete,
          { wsName },
        );
      }

      store.set(workbenchState.$singleSelectDialog, () => {
        return {
          dialogId: 'dialog::delete-ws-path-dialog',
          placeholder: t.app.dialogs.deleteNote.placeholder,
          badgeText: t.app.dialogs.deleteNote.badgeText,
          badgeTone: 'destructive',
          groupHeading: t.app.dialogs.deleteNote.groupHeading,
          emptyMessage: t.app.dialogs.deleteNote.emptyMessage,
          options: wsPaths.map((path) => ({
            title: path.filePath,
            id: path.wsPath,
          })),
          Icon: Trash2,
          hints: [t.app.dialogs.deleteNote.hintDelete],
          initialSearch: wsPath ? WsPath.fromString(wsPath).path : undefined,
          onSelect: (option) => {
            const wsPath = WsPath.fromString(option.id);
            const fileName = wsPath.asFile()?.fileNameWithoutExtension;

            store.set(workbenchState.$alertDialog, () => {
              return {
                dialogId: 'dialog::alert',
                title: t.app.dialogs.confirmDelete.title,
                tone: 'destructive',
                description: t.app.dialogs.confirmDelete.description({
                  fileName: fileName || t.app.common.unknown,
                }),
                continueText: t.app.dialogs.confirmDelete.continueText,
                onContinue: () => {
                  dispatch('command::ws:delete-ws-path', { wsPath: option.id });
                  dispatch('command::ui:focus-editor', null);
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
        throwAppError(
          'error::workspace:not-opened',
          t.app.errors.workspace.notOpened,
          {
            wsPath,
          },
        );
      }
      const fileOldWsPath = oldWsPath.asFile();

      if (!fileOldWsPath) {
        throwAppError(
          'error::file:invalid-note-path',
          t.app.errors.file.invalidNotePath,
          {
            invalidWsPath: oldWsPath.wsPath,
          },
        );
      }

      store.set(workbenchState.$singleInputDialog, () => {
        return {
          dialogId: 'dialog::rename-note-dialog',
          placeholder: t.app.dialogs.renameNote.placeholder,
          badgeText: t.app.dialogs.renameNote.badgeText({
            fileNameWithoutExtension: fileOldWsPath.fileNameWithoutExtension,
          }),
          initialSearch: fileOldWsPath.fileNameWithoutExtension,
          Icon: FilePlus,
          option: {
            id: 'rename-note-dialog',
            title: t.app.dialogs.renameNote.optionTitle,
          },
          onSelect: (input) => {
            const trimmedInput = input.trim();
            if (!trimmedInput) {
              throwAppError(
                'error::file:invalid-operation',
                t.app.errors.file.invalidNoteName,
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
                  t.app.errors.file.cannotMoveDuringRename,
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
            dispatch('command::ui:focus-editor', null);
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
        throwAppError(
          'error::workspace:not-opened',
          t.app.errors.workspace.notOpened,
          {
            wsPath,
          },
        );
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
          placeholder: t.app.dialogs.moveNote.placeholder,
          badgeText: t.app.dialogs.moveNote.badgeText({
            fileNameWithoutExtension: filePath.fileNameWithoutExtension,
          }),
          emptyMessage: t.app.dialogs.moveNote.emptyMessage,
          options,
          Icon: FilePlus,
          groupHeading: t.app.dialogs.moveNote.groupHeading,
          hints: [
            t.app.dialogs.moveNote.hintClick,
            t.app.dialogs.moveNote.hintDrag,
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
            dispatch('command::ui:focus-editor', null);
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
          t.app.errors.workspace.notOpened,
          {},
        );
      }

      store.set(workbenchState.$singleInputDialog, () => {
        return {
          dialogId: 'dialog::new-directory-dialog',
          placeholder: t.app.dialogs.createDirectory.placeholder,
          badgeText: t.app.dialogs.createDirectory.badgeText,
          option: {
            id: 'new-directory-dialog',
            title: t.app.dialogs.createDirectory.optionTitle,
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

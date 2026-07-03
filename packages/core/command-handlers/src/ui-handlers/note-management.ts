import { throwAppError } from '@bangle.io/base-utils';
import { WsDirPath, WsPath } from '@bangle.io/ws-path';
import { FilePlus } from 'lucide-react';
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
          title: t.app.dialogs.createNote.title,
          description: t.app.dialogs.createNote.description,
          inputLabel: t.app.dialogs.createNote.inputLabel,
          placeholder: t.app.dialogs.createNote.placeholder,
          submitText: t.app.dialogs.createNote.submitText,
          onSelect: (input) => {
            dispatch('command::ws:new-note-from-input', {
              inputPath: input.trim(),
            });
            dispatch('command::ui:focus-editor', null);
          },
          initialSearch: prefillName,
        };
      });
    },
  ),

  c(
    'command::ui:delete-note-dialog',
    ({ workbenchState, workspaceState }, { wsPath }, key) => {
      const { store, dispatch } = getCtx(key);
      const targetWsPath = wsPath || store.get(workspaceState.$currentWsPath);

      if (!targetWsPath) {
        throwAppError(
          'error::workspace:not-opened',
          t.app.errors.workspace.notOpened,
          { wsPath },
        );
      }

      const filePath = WsPath.safeParse(targetWsPath).data?.asFile();

      if (!filePath) {
        throwAppError(
          'error::file:invalid-note-path',
          t.app.errors.file.invalidNotePath,
          {
            invalidWsPath: targetWsPath.toString(),
          },
        );
      }

      store.set(workbenchState.$alertDialog, () => {
        return {
          dialogId: 'dialog::alert',
          title: t.app.dialogs.confirmDelete.title,
          tone: 'destructive',
          description: t.app.dialogs.confirmDelete.description({
            fileName: filePath.fileNameWithoutExtension,
          }),
          continueText: t.app.dialogs.confirmDelete.continueText,
          onContinue: () => {
            dispatch('command::ws:delete-ws-path', {
              wsPath: filePath.wsPath,
            });
            dispatch('command::ui:focus-editor', null);
          },
          onCancel: () => {},
        };
      });
    },
  ),

  c('command::ui:delete-file-dialog', ({ workbenchState }, { wsPath }, key) => {
    const { store, dispatch } = getCtx(key);
    const filePath = WsPath.safeParse(wsPath).data?.asFile();

    if (!filePath) {
      throwAppError(
        'error::file:invalid-note-path',
        t.app.errors.file.invalidNotePath,
        {
          invalidWsPath: wsPath,
        },
      );
    }

    store.set(workbenchState.$alertDialog, () => {
      return {
        dialogId: 'dialog::delete-file-alert',
        title: t.app.dialogs.confirmDelete.title,
        tone: 'destructive',
        description: t.app.dialogs.confirmDelete.description({
          fileName: filePath.fileName,
        }),
        continueText: t.app.dialogs.confirmDelete.continueText,
        onContinue: () => {
          dispatch('command::ws:delete-ws-path', {
            wsPath: filePath.wsPath,
          });
          dispatch('command::ui:focus-editor', null);
        },
        onCancel: () => {},
      };
    });
  }),

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
          title: t.app.dialogs.renameNote.title,
          description: t.app.dialogs.renameNote.description({
            fileNameWithoutExtension: fileOldWsPath.fileNameWithoutExtension,
          }),
          inputLabel: t.app.dialogs.renameNote.inputLabel,
          placeholder: t.app.dialogs.renameNote.placeholder,
          initialSearch: fileOldWsPath.fileNameWithoutExtension,
          submitText: t.app.dialogs.renameNote.submitText,
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

  c('command::ui:rename-file-dialog', ({ workbenchState }, { wsPath }, key) => {
    const { store, dispatch } = getCtx(key);
    const filePath = WsPath.safeParse(wsPath).data?.asFile();

    if (!filePath) {
      throwAppError(
        'error::file:invalid-note-path',
        t.app.errors.file.invalidNotePath,
        {
          invalidWsPath: wsPath,
        },
      );
    }

    store.set(workbenchState.$singleInputDialog, () => {
      return {
        dialogId: 'dialog::rename-file-dialog',
        title: t.app.dialogs.renameFile.title,
        description: t.app.dialogs.renameFile.description({
          fileName: filePath.fileName,
        }),
        inputLabel: t.app.dialogs.renameFile.inputLabel,
        placeholder: t.app.dialogs.renameFile.placeholder,
        initialSearch: filePath.fileName,
        submitText: t.app.dialogs.renameFile.submitText,
        onSelect: (input) => {
          const newFileName = input.trim();
          if (!newFileName) {
            throwAppError(
              'error::file:invalid-operation',
              t.app.errors.file.invalidNoteName,
              {
                oldWsPath: filePath.wsPath,
                newWsPath: input,
                operation: 'rename-file',
              },
            );
          }

          if (newFileName.includes('/')) {
            throwAppError(
              'error::file:invalid-operation',
              t.app.errors.file.cannotMoveDuringRename,
              {
                oldWsPath: filePath.wsPath,
                newWsPath: input,
                operation: 'rename-file',
              },
            );
          }

          const parentDirPath = filePath.getParent();
          const relativeNewPath = parentDirPath
            ? WsPath.pathJoin(parentDirPath.path, newFileName)
            : newFileName;
          validateInputPath(relativeNewPath);

          dispatch('command::ws:rename-ws-path', {
            newWsPath: filePath.replaceFileName(newFileName).wsPath,
            wsPath: filePath.wsPath,
          });
          dispatch('command::ui:focus-editor', null);
        },
      };
    });
  }),

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
          title: t.app.dialogs.moveNote.title({
            fileNameWithoutExtension: filePath.fileNameWithoutExtension,
          }),
          description: t.app.dialogs.moveNote.searchPlaceholder,
          searchPlaceholder: t.app.dialogs.moveNote.searchPlaceholder,
          emptyMessage: t.app.dialogs.moveNote.emptyMessage,
          emptyActionText: t.app.dialogs.moveNote.emptyActionText,
          options,
          Icon: FilePlus,
          groupLabel: t.app.dialogs.moveNote.groupLabel,
          hints:
            options.length > 0
              ? [
                  t.app.dialogs.moveNote.hintClick,
                  t.app.dialogs.moveNote.hintDrag,
                ]
              : [t.app.dialogs.moveNote.hintCreateDirectory],
          onEmptyAction: () => {
            dispatch('command::ui:create-directory-dialog', {
              pathPrefix: undefined,
            });
          },
          onSelect: (selectedDir) => {
            let newDirPath = selectedDir.id;
            if (newDirPath === ROOT_ID) {
              newDirPath = '';
            } else {
              newDirPath = WsPath.pathJoin(newDirPath);
            }

            dispatch('command::ws:move-ws-path', {
              wsPath: oldWsPath.wsPath,
              destDirWsPath: WsDirPath.fromParts(oldWsPath.wsName, newDirPath)
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
    ({ workbenchState, workspaceState }, { pathPrefix }, key) => {
      const { store, dispatch } = getCtx(key);
      const wsName = store.get(workspaceState.$currentWsName);

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
          title: t.app.dialogs.createDirectory.title,
          description: t.app.dialogs.createDirectory.description,
          inputLabel: t.app.dialogs.createDirectory.inputLabel,
          placeholder: t.app.dialogs.createDirectory.placeholder,
          submitText: t.app.dialogs.createDirectory.submitText,
          onSelect: (_input) => {
            const input = _input.trim();
            const dirPath = pathPrefix
              ? WsPath.pathJoin(pathPrefix, input)
              : input;

            validateInputPath(dirPath);
            dispatch('command::ws:create-directory', {
              dirWsPath: WsDirPath.fromParts(wsName, dirPath).wsPath,
            });
          },
        };
      });
    },
  ),

  c(
    'command::ui:rename-directory-dialog',
    ({ workbenchState }, { dirWsPath }, key) => {
      const { store, dispatch } = getCtx(key);
      const dirPath = WsPath.fromString(dirWsPath).asDir();

      if (!dirPath || dirPath.isRoot) {
        throwAppError(
          'error::ws-path:invalid-ws-path',
          t.app.errors.wsPath.invalidDirectoryPath,
          {
            invalidPath: dirWsPath,
          },
        );
      }

      store.set(workbenchState.$singleInputDialog, () => {
        return {
          dialogId: 'dialog::rename-directory-dialog',
          title: t.app.dialogs.renameDirectory.badgeText({
            directoryName: dirPath.name,
          }),
          inputLabel: t.app.dialogs.renameDirectory.placeholder,
          placeholder: t.app.dialogs.renameDirectory.placeholder,
          submitText: t.app.dialogs.renameDirectory.optionTitle,
          initialSearch: dirPath.name,
          Icon: FilePlus,
          onSelect: (input) => {
            const newDirectoryName = input.trim();
            if (!newDirectoryName) {
              throwAppError(
                'error::file:invalid-operation',
                t.app.errors.file.invalidNoteName,
                {
                  oldWsPath: dirWsPath,
                  newWsPath: input,
                  operation: 'rename-directory',
                },
              );
            }

            if (newDirectoryName.includes('/')) {
              throwAppError(
                'error::file:invalid-operation',
                t.app.errors.file.cannotMoveDuringRename,
                {
                  oldWsPath: dirWsPath,
                  newWsPath: input,
                  operation: 'rename-directory',
                },
              );
            }

            validateInputPath(newDirectoryName);

            const parentPath = dirPath.getParent()?.path ?? '';
            const newDirPath = WsPath.pathJoin(parentPath, newDirectoryName);

            dispatch('command::ws:rename-directory', {
              oldDirWsPath: dirPath.wsPath,
              newDirWsPath: WsDirPath.fromParts(dirPath.wsName, newDirPath)
                .wsPath,
            });
            dispatch('command::ui:focus-editor', null);
          },
        };
      });
    },
  ),

  c(
    'command::ui:delete-directory-dialog',
    ({ workbenchState }, { dirWsPath }, key) => {
      const { store, dispatch } = getCtx(key);
      const dirPath = WsPath.fromString(dirWsPath).asDir();

      if (!dirPath || dirPath.isRoot) {
        throwAppError(
          'error::ws-path:invalid-ws-path',
          t.app.errors.wsPath.invalidDirectoryPath,
          {
            invalidPath: dirWsPath,
          },
        );
      }

      store.set(workbenchState.$alertDialog, () => {
        return {
          dialogId: 'dialog::delete-directory-alert',
          title: t.app.dialogs.confirmDeleteDirectory.title,
          tone: 'destructive',
          description: t.app.dialogs.confirmDeleteDirectory.description({
            directoryName: dirPath.name,
          }),
          continueText: t.app.dialogs.confirmDeleteDirectory.continueText,
          onContinue: () => {
            dispatch('command::ws:delete-directory', {
              dirWsPath: dirPath.wsPath,
            });
            dispatch('command::ui:focus-editor', null);
          },
          onCancel: () => {},
        };
      });
    },
  ),
];

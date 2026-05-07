import { throwAppError } from '@bangle.io/base-utils';
import { WsPath } from '@bangle.io/ws-path';
import { FilePlus, Trash2 } from 'lucide-react';
import { c, getCtx } from '../helper';
import { validateInputPath } from '../utils';

const DELETE_FOLDER_OPTION_PREFIX = 'delete-folder::';

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
      const selectedWsPath = wsPath ? WsPath.fromString(wsPath) : undefined;
      const selectedDir = selectedWsPath?.asDir();

      if (selectedDir) {
        store.set(workbenchState.$singleSelectDialog, undefined);
        store.set(workbenchState.$alertDialog, () => {
          return {
            dialogId: 'dialog::alert',
            title: t.app.dialogs.confirmDelete.title,
            tone: 'destructive',
            description: t.app.dialogs.confirmDelete.description({
              fileName: selectedDir.name || t.app.common.unknown,
            }),
            continueText: t.app.dialogs.confirmDelete.continueText,
            onContinue: () => {
              dispatch('command::ws:delete-ws-path', {
                wsPath: selectedDir.wsPath,
              });
              dispatch('command::ui:focus-editor', null);
            },
            onCancel: () => {},
          };
        });
        return;
      }

      const wsPaths = store.get(workspaceState.$wsPaths);
      const wsName = store.get(workspaceState.$currentWsName);

      if (!wsName || !wsPaths || wsPaths.length === 0) {
        throwAppError(
          'error::workspace:no-notes-found',
          t.app.errors.workspace.noNotesToDelete,
          { wsName },
        );
      }

      const folderDeleteCandidate = wsPath
        ? getFolderDeleteCandidateWsPath({
            wsPath,
            wsName,
            fileWsPaths: wsPaths.map((path) => path.wsPath),
          })
        : undefined;

      const showDeleteAlert = ({
        targetWsPath,
        targetName,
      }: {
        targetWsPath: string;
        targetName: string;
      }) => {
        store.set(workbenchState.$alertDialog, () => {
          return {
            dialogId: 'dialog::alert',
            title: t.app.dialogs.confirmDelete.title,
            tone: 'destructive',
            description: t.app.dialogs.confirmDelete.description({
              fileName: targetName || t.app.common.unknown,
            }),
            continueText: t.app.dialogs.confirmDelete.continueText,
            onContinue: () => {
              dispatch('command::ws:delete-ws-path', {
                wsPath: targetWsPath,
              });
              dispatch('command::ui:focus-editor', null);
            },
            onCancel: () => {},
          };
        });
      };

      store.set(workbenchState.$singleSelectDialog, () => {
        const options: Array<{
          title: string;
          id: string;
          icon?: typeof Trash2;
        }> = wsPaths.map((path) => ({
          title: path.filePath,
          id: path.wsPath,
        }));

        if (folderDeleteCandidate) {
          const folderPath = WsPath.fromString(folderDeleteCandidate).path;
          options.unshift({
            title: `Delete entire folder: ${folderPath}`,
            id: `${DELETE_FOLDER_OPTION_PREFIX}${folderDeleteCandidate}`,
            icon: Trash2,
          });
        }

        return {
          dialogId: 'dialog::delete-ws-path-dialog',
          placeholder: t.app.dialogs.deleteNote.placeholder,
          badgeText: t.app.dialogs.deleteNote.badgeText,
          badgeTone: 'destructive',
          groupHeading: t.app.dialogs.deleteNote.groupHeading,
          emptyMessage: t.app.dialogs.deleteNote.emptyMessage,
          options,
          Icon: Trash2,
          hints: [t.app.dialogs.deleteNote.hintDelete],
          initialSearch: wsPath ? WsPath.fromString(wsPath).path : undefined,
          onSelect: (option) => {
            if (option.id.startsWith(DELETE_FOLDER_OPTION_PREFIX)) {
              const folderWsPath = option.id.slice(
                DELETE_FOLDER_OPTION_PREFIX.length,
              );
              showDeleteAlert({
                targetWsPath: folderWsPath,
                targetName:
                  WsPath.fromString(folderWsPath).asDir()?.name ||
                  t.app.common.unknown,
              });
              return;
            }

            const parsedWsPath = WsPath.fromString(option.id);
            showDeleteAlert({
              targetWsPath: option.id,
              targetName:
                parsedWsPath.asFile()?.fileNameWithoutExtension ||
                t.app.common.unknown,
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
      const dirOldWsPath = oldWsPath.asDir();
      if (!fileOldWsPath && !dirOldWsPath) {
        throwAppError(
          'error::file:invalid-note-path',
          t.app.errors.file.invalidNotePath,
          {
            invalidWsPath: oldWsPath.wsPath,
          },
        );
      }
      const oldName =
        fileOldWsPath?.fileNameWithoutExtension ||
        dirOldWsPath?.name ||
        t.app.common.unknown;

      store.set(workbenchState.$singleInputDialog, () => {
        return {
          dialogId: 'dialog::rename-note-dialog',
          placeholder: t.app.dialogs.renameNote.placeholder,
          badgeText: t.app.dialogs.renameNote.badgeText({
            fileNameWithoutExtension: oldName,
          }),
          initialSearch: oldName,
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

            if (trimmedInput.includes('/')) {
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

            let newWsPath: WsPath;
            if (fileOldWsPath) {
              const newName =
                trimmedInput +
                (trimmedInput.endsWith(WsPath.DEFAULT_NOTE_EXTENSION)
                  ? ''
                  : WsPath.DEFAULT_NOTE_EXTENSION);
              const parentDirPath = fileOldWsPath.getParent();
              const relativeNewPath = parentDirPath
                ? WsPath.pathJoin(parentDirPath.path, newName)
                : newName;
              validateInputPath(relativeNewPath);
              newWsPath = fileOldWsPath.replaceFileName(newName);
            } else if (dirOldWsPath) {
              const parentDirPath = dirOldWsPath.getParent();
              const relativeNewPath = parentDirPath
                ? WsPath.pathJoin(parentDirPath.path, trimmedInput)
                : trimmedInput;
              validateInputPath(relativeNewPath);
              newWsPath = WsPath.fromParts(
                dirOldWsPath.wsName,
                relativeNewPath,
              );
            } else {
              throwAppError(
                'error::file:invalid-note-path',
                t.app.errors.file.invalidNotePath,
                {
                  invalidWsPath: oldWsPath.wsPath,
                },
              );
            }

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
            return parent ? normalizeDirPath(parent.path) : '';
          }),
        ),
      ].filter((dirPath) => dirPath !== '');

      const filePath = oldWsPath.asFile();
      const directoryPath = oldWsPath.asDir();
      const oldDirPath = filePath
        ? normalizeDirPath(filePath.getParent()?.path || '')
        : normalizeDirPath(directoryPath?.path || '');
      const isAtRoot = oldDirPath === '';

      const options = dirPaths
        .filter((dirPath) => {
          if (dirPath === oldDirPath) {
            return false;
          }
          if (directoryPath) {
            const sourcePath = normalizeDirPath(directoryPath.path);
            return !dirPath.startsWith(`${sourcePath}/`);
          }
          return true;
        })
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
            fileNameWithoutExtension:
              filePath?.fileNameWithoutExtension ||
              directoryPath?.name ||
              t.app.common.unknown,
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

function normalizeDirPath(path: string): string {
  if (!path) {
    return '';
  }
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function getFolderDeleteCandidateWsPath({
  wsPath,
  wsName,
  fileWsPaths,
}: {
  wsPath: string;
  wsName: string;
  fileWsPaths: string[];
}): string | undefined {
  const parsed = WsPath.fromString(wsPath);
  const directDir = parsed.asDir();
  if (directDir) {
    return directDir.wsPath;
  }

  const candidatePath = normalizeDirPath(parsed.path);
  if (!candidatePath) {
    return undefined;
  }

  const hasChildren = fileWsPaths.some((fileWsPath) => {
    const filePath = WsPath.fromString(fileWsPath).asFile();
    return !!filePath && filePath.path.startsWith(`${candidatePath}/`);
  });

  if (!hasChildren) {
    return undefined;
  }

  return WsPath.fromParts(wsName, `${candidatePath}/`).wsPath;
}

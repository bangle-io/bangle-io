import React, { useCallback, useEffect, useState } from 'react';

import { useActionContext } from '@bangle.io/action-context';
import {
  CORE_ACTIONS_CLOSE_EDITOR,
  CORE_ACTIONS_CREATE_BROWSER_WORKSPACE,
  CORE_ACTIONS_CREATE_NATIVE_FS_WORKSPACE,
  CORE_ACTIONS_DELETE_ACTIVE_NOTE,
  CORE_ACTIONS_DOWNLOAD_WORKSPACE_COPY,
  CORE_ACTIONS_NEW_NOTE,
  CORE_ACTIONS_NEW_WORKSPACE,
  CORE_ACTIONS_NEW_WORKSPACE_FROM_BACKUP,
  CORE_ACTIONS_RENAME_ACTIVE_NOTE,
  CORE_ACTIONS_TOGGLE_EDITOR_SPLIT,
  CORE_ACTIONS_TOGGLE_NOTE_SIDEBAR,
  CORE_ACTIONS_TOGGLE_THEME,
  WorkerErrorCode,
} from '@bangle.io/constants';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { useUIManagerContext } from '@bangle.io/ui-context';
import {
  deleteNote,
  refreshWsPaths,
  updateOpenedWsPaths,
  useWorkspaceContext,
} from '@bangle.io/workspace-context';
import { useWorkspaces, WorkspaceType } from '@bangle.io/workspaces';
import { resolvePath } from '@bangle.io/ws-path';
import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';

import { NewNoteInputModal, RenameNoteInputModal } from './NewNoteInputModal';
import { sleep } from '@bangle.io/utils';
import { downloadBlob, filePicker } from './backup';

export function CoreActionsHandler({ registerActionHandler }) {
  const { dispatch } = useUIManagerContext();
  const { dispatchAction } = useActionContext();
  const { createWorkspace } = useWorkspaces();
  const { primaryEditor, secondaryEditor } = useEditorManagerContext();
  const { wsName, openedWsPaths, bangleStore } = useWorkspaceContext();
  const { primaryWsPath, secondaryWsPath } = openedWsPaths;

  const [inputModal, updateInputModal] = useState<{
    type: string | undefined;
    clone?: boolean;
    initialValue?: string;
    resetWsName?: string;
  }>({ type: undefined });

  const actionHandler = useCallback(
    (actionObject) => {
      switch (actionObject.name) {
        case CORE_ACTIONS_TOGGLE_THEME: {
          dispatch({
            name: 'UI/TOGGLE_THEME',
          });
          return true;
        }

        case CORE_ACTIONS_NEW_NOTE: {
          if (!wsName) {
            dispatch({
              name: 'UI/SHOW_NOTIFICATION',
              value: {
                severity: 'error',
                uid: 'new-note-not-no-workspace',
                content: 'Please first select a workspace',
              },
            });
            return true;
          }
          // To avoid overlapping
          dispatch({
            name: 'UI/UPDATE_PALETTE',
            value: { type: null },
          });
          updateInputModal({
            type: 'new-note',
            initialValue: actionObject.value,
          });

          return true;
        }

        case CORE_ACTIONS_NEW_WORKSPACE: {
          // To avoid overlapping
          dispatch({
            name: 'UI/SHOW_MODAL',
            value: { modal: '@modal/new-workspace' },
          });
          return true;
        }

        case CORE_ACTIONS_RENAME_ACTIVE_NOTE: {
          if (!primaryWsPath) {
            dispatch({
              name: 'UI/SHOW_NOTIFICATION',
              value: {
                severity: 'error',
                uid: 'rename-wsPath-not-found',
                content: 'Cannot rename because there is no active note',
              },
            });
            return true;
          }

          // To avoid overlapping
          dispatch({
            name: 'UI/UPDATE_PALETTE',
            value: { type: null },
          });
          updateInputModal({ type: 'rename-note' });
          return true;
        }

        case CORE_ACTIONS_TOGGLE_NOTE_SIDEBAR: {
          dispatch({
            name: 'UI/TOGGLE_NOTE_SIDEBAR',
          });
          return true;
        }

        case CORE_ACTIONS_DELETE_ACTIVE_NOTE: {
          if (!primaryWsPath) {
            dispatch({
              name: 'UI/SHOW_NOTIFICATION',
              value: {
                severity: 'error',
                uid: 'delete-wsPath-not-found',
                content: 'Cannot delete because there is no active note',
              },
            });
            return true;
          }

          dispatch({
            name: 'UI/UPDATE_PALETTE',
            value: { type: null },
          });

          if (
            window.confirm(
              `Are you sure you want to remove "${
                resolvePath(primaryWsPath).filePath
              }"? It cannot be undone.`,
            )
          ) {
            deleteNote(primaryWsPath)(
              bangleStore.state,
              bangleStore.dispatch,
              bangleStore,
            )
              .then((error) => {
                dispatch({
                  name: 'UI/SHOW_NOTIFICATION',
                  value: {
                    severity: 'success',
                    uid: 'success-delete-' + primaryWsPath,
                    content: 'Successfully deleted ' + primaryWsPath,
                  },
                });
              })
              .catch((error) => {
                dispatch({
                  name: 'UI/SHOW_NOTIFICATION',
                  value: {
                    severity: 'error',
                    uid: 'delete-' + primaryWsPath,
                    content: error.displayMessage || error.message,
                  },
                });
              });
          }
          return true;
        }

        case CORE_ACTIONS_TOGGLE_EDITOR_SPLIT: {
          if (secondaryWsPath) {
            updateOpenedWsPaths((openedWsPath) =>
              openedWsPath.updateSecondaryWsPath(undefined),
            )(bangleStore.state, bangleStore.dispatch);
          } else if (primaryWsPath) {
            updateOpenedWsPaths((openedWsPath) =>
              openedWsPath.updateSecondaryWsPath(primaryWsPath),
            )(bangleStore.state, bangleStore.dispatch);
          }
          return true;
        }

        case CORE_ACTIONS_CLOSE_EDITOR: {
          const editorId = actionObject.value;
          if (typeof editorId === 'number') {
            updateOpenedWsPaths((openedWsPaths) =>
              openedWsPaths.updateByIndex(editorId, undefined).shrink(),
            )(bangleStore.state, bangleStore.dispatch);
          } else {
            updateOpenedWsPaths((openedWsPaths) => openedWsPaths.closeAll())(
              bangleStore.state,
              bangleStore.dispatch,
            );
          }

          return true;
        }

        case CORE_ACTIONS_CREATE_BROWSER_WORKSPACE: {
          const { wsName } = actionObject.value || {};
          if (typeof wsName === 'string') {
            createWorkspace(wsName, WorkspaceType.browser, {})
              .then((r) => {
                (window as any).fathom?.trackGoal('AISLCLRF', 0);
              })
              .catch((error) => {
                dispatch({
                  name: 'UI/SHOW_NOTIFICATION',
                  value: {
                    severity: 'error',
                    uid: 'error-create-workspace-' + wsName,
                    content: 'Unable to create workspace ' + wsName,
                  },
                });
                throw error;
              });
          } else {
            throw new Error(
              'Incorrect parameters for ' +
                CORE_ACTIONS_CREATE_BROWSER_WORKSPACE,
            );
          }
          return true;
        }

        case CORE_ACTIONS_CREATE_NATIVE_FS_WORKSPACE: {
          const { rootDirHandle } = actionObject.value || {};
          if (typeof rootDirHandle?.name === 'string') {
            createWorkspace(rootDirHandle.name, WorkspaceType.nativefs, {
              rootDirHandle,
            })
              .then(() => {
                (window as any).fathom?.trackGoal('K3NFTGWX', 0);
              })
              .catch((error) => {
                dispatch({
                  name: 'UI/SHOW_NOTIFICATION',
                  value: {
                    severity: 'error',
                    uid: 'error-create-workspace-' + rootDirHandle?.name,
                    content:
                      'Unable to create workspace ' + rootDirHandle?.name,
                  },
                });
                throw error;
              });
          } else {
            throw new Error(
              'Incorrect parameters for ' +
                CORE_ACTIONS_CREATE_NATIVE_FS_WORKSPACE,
            );
          }
          return true;
        }

        case CORE_ACTIONS_DOWNLOAD_WORKSPACE_COPY: {
          if (!wsName) {
            dispatch({
              name: 'UI/SHOW_NOTIFICATION',
              value: {
                severity: 'error',
                uid: CORE_ACTIONS_DOWNLOAD_WORKSPACE_COPY + 'no-workspace',
                content: 'Please open a workspace first',
              },
            });
            return false;
          }
          const abortController = new AbortController();
          dispatch({
            name: 'UI/SHOW_NOTIFICATION',
            value: {
              severity: 'info',
              uid: 'downloading-ws-copy' + wsName,
              content:
                'Hang tight! your backup zip will be downloaded momentarily.',
            },
          });
          naukarWorkerProxy
            .abortableBackupAllFiles(abortController.signal, wsName)
            .then((blob: File) => {
              downloadBlob(blob, blob.name);
            });
          return true;
        }

        case CORE_ACTIONS_NEW_WORKSPACE_FROM_BACKUP: {
          if (!wsName) {
            dispatch({
              name: 'UI/SHOW_NOTIFICATION',
              value: {
                severity: 'error',
                uid: CORE_ACTIONS_NEW_WORKSPACE_FROM_BACKUP + 'no-workspace',
                content: 'Please create an empty workspace first',
              },
            });

            return false;
          }

          filePicker()
            .then((file) => {
              const abortController = new AbortController();
              dispatch({
                name: 'UI/SHOW_NOTIFICATION',
                value: {
                  severity: 'info',
                  uid: 'recovery-started' + wsName,
                  content:
                    'Hang tight! Bangle is processing your notes. Please donot reload or close the tab.',
                },
              });

              return naukarWorkerProxy.abortableCreateWorkspaceFromBackup(
                abortController.signal,
                wsName,
                file,
              );
            })
            .then(() => {
              return sleep(100);
            })
            .then(
              () => {
                refreshWsPaths()(bangleStore.state, bangleStore.dispatch);
                dispatch({
                  name: 'UI/SHOW_NOTIFICATION',
                  value: {
                    severity: 'success',
                    uid: 'recovery-finished' + wsName,
                    content: 'Your notes have successfully recovered.',
                  },
                });
              },
              (error) => {
                // comlink is unable to understand custom errors
                if (
                  error?.message?.includes(
                    WorkerErrorCode.EMPTY_WORKSPACE_NEEDED,
                  )
                ) {
                  dispatch({
                    name: 'UI/SHOW_NOTIFICATION',
                    value: {
                      severity: 'error',
                      uid:
                        CORE_ACTIONS_NEW_WORKSPACE_FROM_BACKUP +
                        'workspace-has-things',
                      content: 'This action requires an empty workspace.',
                    },
                  });
                  return;
                }
              },
            );

          return true;
        }

        case 'action::bangle-io-core-actions:focus-primary-editor': {
          primaryEditor?.focusView();
          return true;
        }

        case 'action::bangle-io-core-actions:focus-secondary-editor': {
          secondaryEditor?.focusView();
          return true;
        }
        default: {
          return false;
        }
      }
    },
    [
      dispatch,
      bangleStore,
      wsName,
      primaryWsPath,
      secondaryWsPath,
      createWorkspace,
      primaryEditor,
      secondaryEditor,
    ],
  );

  useEffect(() => {
    const deregister = registerActionHandler((obj) => {
      actionHandler(obj);
    });
    return () => {
      deregister();
    };
  }, [actionHandler, registerActionHandler]);

  const onDismiss = useCallback(
    (focusEditor = true) => {
      updateInputModal({ type: undefined });
      if (focusEditor) {
        dispatchAction({
          name: 'action::bangle-io-core-actions:focus-primary-editor',
        });
      }
    },
    [dispatchAction],
  );

  if (inputModal.type === 'new-note') {
    return (
      <NewNoteInputModal
        onDismiss={onDismiss}
        initialValue={inputModal.initialValue}
      />
    );
  }

  if (inputModal.type === 'rename-note') {
    return <RenameNoteInputModal onDismiss={onDismiss} />;
  }

  return null;
}

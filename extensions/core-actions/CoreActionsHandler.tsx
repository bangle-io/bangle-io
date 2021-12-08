import React, { useCallback, useEffect, useState } from 'react';

import { useActionContext } from '@bangle.io/action-context';
import {
  CORE_ACTIONS_CLOSE_EDITOR,
  CORE_ACTIONS_CREATE_BROWSER_WORKSPACE,
  CORE_ACTIONS_CREATE_NATIVE_FS_WORKSPACE,
  CORE_ACTIONS_DELETE_ACTIVE_NOTE,
  CORE_ACTIONS_NEW_NOTE,
  CORE_ACTIONS_NEW_WORKSPACE,
  CORE_ACTIONS_RENAME_ACTIVE_NOTE,
  CORE_ACTIONS_SHOW_ONBOARDING_MODAL,
  CORE_ACTIONS_TOGGLE_EDITOR_SPLIT,
  CORE_ACTIONS_TOGGLE_NOTE_SIDEBAR,
  CORE_ACTIONS_TOGGLE_THEME,
} from '@bangle.io/constants';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { useWorkspaces, WorkspaceType } from '@bangle.io/workspaces';
import { resolvePath } from '@bangle.io/ws-path';

import { NewNoteInputModal, RenameNoteInputModal } from './NewNoteInputModal';

export function CoreActionsHandler({ registerActionHandler }) {
  const { dispatch } = useUIManagerContext();
  const { dispatchAction } = useActionContext();
  const { createWorkspace } = useWorkspaces();

  const {
    wsName,
    primaryWsPath,
    secondaryWsPath,
    deleteNote,
    updateOpenedWsPaths,
  } = useWorkspaceContext();

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
            type: 'UI/TOGGLE_THEME',
          });
          return true;
        }

        case CORE_ACTIONS_NEW_NOTE: {
          if (!wsName) {
            dispatch({
              type: 'UI/SHOW_NOTIFICATION',
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
            type: 'UI/UPDATE_PALETTE',
            value: { type: undefined },
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
            type: 'UI/SHOW_MODAL',
            value: { modal: '@modal/new-workspace' },
          });
          return true;
        }

        case CORE_ACTIONS_SHOW_ONBOARDING_MODAL: {
          // To avoid overlapping
          dispatch({
            type: 'UI/SHOW_MODAL',
            value: { modal: '@modal/onboarding' },
          });
          return true;
        }

        case CORE_ACTIONS_RENAME_ACTIVE_NOTE: {
          if (!primaryWsPath) {
            dispatch({
              type: 'UI/SHOW_NOTIFICATION',
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
            type: 'UI/UPDATE_PALETTE',
            value: { type: undefined },
          });
          updateInputModal({ type: 'rename-note' });
          return true;
        }

        case CORE_ACTIONS_TOGGLE_NOTE_SIDEBAR: {
          dispatch({
            type: 'UI/TOGGLE_NOTE_SIDEBAR',
          });
          return true;
        }

        case CORE_ACTIONS_DELETE_ACTIVE_NOTE: {
          if (!primaryWsPath) {
            dispatch({
              type: 'UI/SHOW_NOTIFICATION',
              value: {
                severity: 'error',
                uid: 'delete-wsPath-not-found',
                content: 'Cannot delete because there is no active note',
              },
            });
            return true;
          }

          dispatch({
            type: 'UI/UPDATE_PALETTE',
            value: { type: undefined },
          });

          if (
            window.confirm(
              `Are you sure you want to remove "${
                resolvePath(primaryWsPath).filePath
              }"? It cannot be undone.`,
            )
          ) {
            deleteNote(primaryWsPath)
              .then((error) => {
                dispatch({
                  type: 'UI/SHOW_NOTIFICATION',
                  value: {
                    severity: 'success',
                    uid: 'success-delete-' + primaryWsPath,
                    content: 'Successfully deleted ' + primaryWsPath,
                  },
                });
              })
              .catch((error) => {
                dispatch({
                  type: 'UI/SHOW_NOTIFICATION',
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
            );
          } else if (primaryWsPath) {
            updateOpenedWsPaths((openedWsPath) =>
              openedWsPath.updateSecondaryWsPath(primaryWsPath),
            );
          }
          return true;
        }

        case CORE_ACTIONS_CLOSE_EDITOR: {
          const editorId = actionObject.value;
          if (editorId) {
            updateOpenedWsPaths((openedWsPaths) =>
              openedWsPaths.updateByIndex(editorId, undefined).shrink(),
            );
          } else {
            updateOpenedWsPaths((openedWsPaths) => openedWsPaths.closeAll());
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
                  type: 'UI/SHOW_NOTIFICATION',
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
                  type: 'UI/SHOW_NOTIFICATION',
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

        default: {
          return false;
        }
      }
    },
    [
      dispatch,
      deleteNote,
      wsName,
      primaryWsPath,
      secondaryWsPath,
      createWorkspace,
      updateOpenedWsPaths,
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
          name: 'action::bangle-io-editor-core:focus-primary-editor',
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

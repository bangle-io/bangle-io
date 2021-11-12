import React, { useCallback, useEffect, useState } from 'react';

import { useActionContext } from '@bangle.io/action-context';
import {
  CORE_ACTIONS_CLONE_WORKSPACE,
  CORE_ACTIONS_CLOSE_EDITOR,
  CORE_ACTIONS_DELETE_ACTIVE_NOTE,
  CORE_ACTIONS_NEW_NOTE,
  CORE_ACTIONS_NEW_WORKSPACE,
  CORE_ACTIONS_RENAME_ACTIVE_NOTE,
  CORE_ACTIONS_TOGGLE_EDITOR_SPLIT,
  CORE_ACTIONS_TOGGLE_FILE_SIDEBAR,
  CORE_ACTIONS_TOGGLE_THEME,
} from '@bangle.io/constants';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { resolvePath } from '@bangle.io/ws-path';

import { NewNoteInputModal, RenameNoteInputModal } from './NewNoteInputModal';
import { NewWorkspaceInputModal } from './NewWorkspaceInputModal';

export function CoreActionsHandler({ registerActionHandler }) {
  const { dispatch } = useUIManagerContext();
  const { dispatchAction } = useActionContext();
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
        case CORE_ACTIONS_TOGGLE_FILE_SIDEBAR: {
          dispatch({
            type: 'UI/TOGGLE_SIDEBAR',
            value: { type: 'file-browser' },
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
            type: 'UI/UPDATE_PALETTE',
            value: { type: null },
          });
          updateInputModal({ type: 'new-workspace' });
          return true;
        }

        case CORE_ACTIONS_CLONE_WORKSPACE: {
          // no point clone if there is no active workspace
          if (!wsName) {
            dispatch({
              type: 'UI/SHOW_NOTIFICATION',
              value: {
                severity: 'error',
                uid: 'clone-workspace-no-active-workspace',
                content: 'No active workspace',
              },
            });
            return true;
          }
          // To avoid overlapping
          dispatch({
            type: 'UI/UPDATE_PALETTE',
            value: { type: null },
          });
          updateInputModal({
            type: 'new-workspace',
            clone: true,
            // used with help workspace to reset its content
            resetWsName: actionObject.value?.resetWsName,
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
            value: { type: null },
          });
          updateInputModal({ type: 'rename-note' });
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
            value: { type: null },
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
  if (inputModal.type === 'new-workspace') {
    return (
      <NewWorkspaceInputModal
        onDismiss={onDismiss}
        clone={inputModal.clone}
        resetWsName={inputModal.resetWsName}
      />
    );
  }
  return null;
}

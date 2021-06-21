import React, {
  useRef,
  useContext,
  useEffect,
  useCallback,
  useState,
} from 'react';
import {
  NEW_NOTE_ACTION,
  TOGGLE_FILE_SIDEBAR_ACTION,
  TOGGLE_THEME_ACTION,
  NEW_WORKSPACE_ACTION,
  RENAME_ACTIVE_NOTE_ACTION,
  DELETE_ACTIVE_NOTE_ACTION,
  CLONE_WORKSPACE_ACTION,
} from './config';
import { UIManagerContext } from 'ui-context/index';
import { NewNoteInputModal, RenameNoteInputModal } from './NewNoteInputModal';
import { ActionContext } from 'action-context';
import { NewWorkspaceInputModal } from './NewWorkspaceInputModal';
import { useWorkspaceContext } from 'workspace-context/index';
import { resolvePath } from 'ws-path';

export function CoreActionsHandler({ registerActionHandler }) {
  const { dispatch } = useContext(UIManagerContext);
  const { dispatchAction } = useContext(ActionContext);
  const { wsName, primaryWsPath, deleteNote } = useWorkspaceContext();

  const [inputModal, updateInputModal] = useState({});

  const actionHandler = useCallback(
    (actionObject) => {
      switch (actionObject.name) {
        case TOGGLE_THEME_ACTION: {
          dispatch({
            type: 'UI/TOGGLE_THEME',
          });
          return true;
        }
        case TOGGLE_FILE_SIDEBAR_ACTION: {
          dispatch({
            type: 'UI/TOGGLE_SIDEBAR',
            value: { type: 'file-browser' },
          });
          return true;
        }
        case NEW_NOTE_ACTION: {
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

        case NEW_WORKSPACE_ACTION: {
          // To avoid overlapping
          dispatch({
            type: 'UI/UPDATE_PALETTE',
            value: { type: null },
          });
          updateInputModal({ type: 'new-workspace' });
          return true;
        }

        case CLONE_WORKSPACE_ACTION: {
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

        case RENAME_ACTIVE_NOTE_ACTION: {
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

        case DELETE_ACTIVE_NOTE_ACTION: {
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

        default: {
          return false;
        }
      }
    },
    [dispatch, deleteNote, wsName, primaryWsPath],
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
      updateInputModal({});
      if (focusEditor) {
        dispatchAction({ name: '@action/editor-core/focus-primary-editor' });
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

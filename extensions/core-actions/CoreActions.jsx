import React, { useContext, useEffect, useCallback, useState } from 'react';
import {
  NEW_NOTE_ACTION,
  TOGGLE_FILE_SIDEBAR_ACTION,
  TOGGLE_THEME_ACTION,
  NEW_WORKSPACE_ACTION,
  RENAME_ACTIVE_NOTE_ACTION,
  DELETE_ACTIVE_NOTE_ACTION,
} from './config';
import { UIManagerContext } from 'ui-context/index';
import { NewNoteInputModal, RenameNoteInputModal } from './NewNoteInputModal';
import { ActionContext } from 'action-context';
import { NewWorkspaceInputModal } from './NewWorkspaceInputModal';
import { useWorkspacePath } from 'workspace/index';
import { useWorkspaceHooksContext } from 'workspace-hooks/index';

export function CoreActions({ registerActionHandler }) {
  const { dispatch } = useContext(UIManagerContext);
  const { dispatchAction } = useContext(ActionContext);
  const { wsName, wsPath, filePath } = useWorkspacePath();
  const { deleteNote } = useWorkspaceHooksContext();

  const [inputModal, updateInputModal] = useState(null);
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
          updateInputModal('new-note');
          return true;
        }

        case NEW_WORKSPACE_ACTION: {
          // To avoid overlapping
          dispatch({
            type: 'UI/UPDATE_PALETTE',
            value: { type: null },
          });
          updateInputModal('new-workspace');
          return true;
        }

        case RENAME_ACTIVE_NOTE_ACTION: {
          if (!wsPath) {
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
          updateInputModal('rename-note');
          return true;
        }

        case DELETE_ACTIVE_NOTE_ACTION: {
          if (!wsPath) {
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
              `Are you sure you want to remove "${filePath}"? It cannot be undone.`,
            )
          ) {
            deleteNote(wsPath)
              .then((error) => {
                dispatch({
                  type: 'UI/SHOW_NOTIFICATION',
                  value: {
                    severity: 'success',
                    uid: 'success-delete-' + wsPath,
                    content: 'Successfully deleted ' + wsPath,
                  },
                });
              })
              .catch((error) => {
                dispatch({
                  type: 'UI/SHOW_NOTIFICATION',
                  value: {
                    severity: 'error',
                    uid: 'delete-' + wsPath,
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
    [dispatch, deleteNote, filePath, wsName, wsPath],
  );

  useEffect(() => {
    const deregister = registerActionHandler((obj) => {
      actionHandler(obj);
    });
    return () => {
      deregister();
    };
  }, [actionHandler, registerActionHandler]);

  const dismissModal = useCallback(
    (focusEditor = true) => {
      updateInputModal(null);
      if (focusEditor) {
        dispatchAction({ name: '@action/editor-core/focus-primary-editor' });
      }
    },
    [dispatchAction],
  );

  if (inputModal === 'new-note') {
    return <NewNoteInputModal dismissModal={dismissModal} />;
  }
  if (inputModal === 'rename-note') {
    return <RenameNoteInputModal dismissModal={dismissModal} />;
  }
  if (inputModal === 'new-workspace') {
    return <NewWorkspaceInputModal dismissModal={dismissModal} />;
  }
  return null;
}

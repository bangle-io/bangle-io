import React, { useCallback, useEffect } from 'react';

import {
  CORE_ACTIONS_CREATE_BROWSER_WORKSPACE,
  CORE_ACTIONS_CREATE_NATIVE_FS_WORKSPACE,
} from '@bangle.io/constants';
import {
  closeEditor,
  deleteActiveNote,
  newNote,
  newWorkspace,
  renameNote,
  splitEditor,
} from '@bangle.io/core-operations';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { useWorkspaces, WorkspaceType } from '@bangle.io/workspaces';

import {
  CORE_ACTIONS_CLOSE_EDITOR,
  CORE_ACTIONS_DELETE_ACTIVE_NOTE,
  CORE_ACTIONS_DOWNLOAD_WORKSPACE_COPY,
  CORE_ACTIONS_NEW_NOTE,
  CORE_ACTIONS_NEW_WORKSPACE,
  CORE_ACTIONS_NEW_WORKSPACE_FROM_BACKUP,
  CORE_ACTIONS_RENAME_ACTIVE_NOTE,
  CORE_ACTIONS_TOGGLE_EDITOR_SPLIT,
  CORE_ACTIONS_TOGGLE_NOTE_SIDEBAR,
} from './config';
import { NewNoteInputModal, RenameNoteInputModal } from './NewNoteInputModal';
import { downloadWorkspace, restoreWorkspaceFromBackup } from './operations';

export function CoreActionsHandler({ registerSerialOperationHandler }) {
  const { dispatch, modal, modalValue } = useUIManagerContext();
  const { createWorkspace } = useWorkspaces();
  const { primaryEditor, secondaryEditor } = useEditorManagerContext();
  const { bangleStore } = useWorkspaceContext();

  const handler = useCallback(
    (operation) => {
      switch (operation.name) {
        case CORE_ACTIONS_NEW_NOTE: {
          newNote()(bangleStore.state, bangleStore.dispatch);
          return true;
        }

        case CORE_ACTIONS_NEW_WORKSPACE: {
          newWorkspace()(bangleStore.state, bangleStore.dispatch);
          return true;
        }

        case CORE_ACTIONS_RENAME_ACTIVE_NOTE: {
          renameNote()(bangleStore.state, bangleStore.dispatch);
          return true;
        }

        case CORE_ACTIONS_TOGGLE_NOTE_SIDEBAR: {
          dispatch({
            name: 'UI/TOGGLE_NOTE_SIDEBAR',
          });
          return true;
        }

        case CORE_ACTIONS_DELETE_ACTIVE_NOTE: {
          deleteActiveNote()(
            bangleStore.state,
            bangleStore.dispatch,
            bangleStore,
          );
          return true;
        }

        case CORE_ACTIONS_TOGGLE_EDITOR_SPLIT: {
          splitEditor()(bangleStore.state, bangleStore.dispatch);
          return true;
        }

        case CORE_ACTIONS_CLOSE_EDITOR: {
          const editorId = operation.value;
          closeEditor(editorId)(bangleStore.state, bangleStore.dispatch);
          return true;
        }

        case CORE_ACTIONS_DOWNLOAD_WORKSPACE_COPY: {
          downloadWorkspace()(bangleStore.state, bangleStore.dispatch);
          return true;
        }

        case CORE_ACTIONS_NEW_WORKSPACE_FROM_BACKUP: {
          restoreWorkspaceFromBackup()(
            bangleStore.state,
            bangleStore.dispatch,
            bangleStore,
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

        case CORE_ACTIONS_CREATE_BROWSER_WORKSPACE: {
          const { wsName } = operation.value || {};

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
          const { rootDirHandle } = operation.value || {};
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

        default: {
          return false;
        }
      }
    },
    [dispatch, bangleStore, createWorkspace, primaryEditor, secondaryEditor],
  );

  useEffect(() => {
    const deregister = registerSerialOperationHandler((obj) => {
      handler(obj);
    });
    return () => {
      deregister();
    };
  }, [handler, registerSerialOperationHandler]);

  const onDismiss = useCallback(
    (focusEditor = true) => {
      dispatch({
        name: 'UI/DISMISS_MODAL',
      });
      if (focusEditor) {
        primaryEditor?.focusView();
      }
    },
    [primaryEditor, dispatch],
  );

  if (modal === 'new-note') {
    return (
      <NewNoteInputModal
        onDismiss={onDismiss}
        initialValue={modalValue?.initialValue}
      />
    );
  }

  if (modal === 'rename-note') {
    return <RenameNoteInputModal onDismiss={onDismiss} />;
  }

  return null;
}

import React, { useCallback } from 'react';

import { useSerialOperationHandler } from '@bangle.io/action-context';
import {
  CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
  CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
} from '@bangle.io/constants';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { useWorkspaces, WorkspaceType } from '@bangle.io/workspaces';

import { NewNoteInputModal, RenameNoteInputModal } from './NewNoteInputModal';

export function CoreActionsHandler() {
  const { dispatch, modal, modalValue } = useUIManagerContext();
  const { createWorkspace } = useWorkspaces();
  const { primaryEditor } = useEditorManagerContext();

  useSerialOperationHandler(
    (operation) => {
      switch (operation.name) {
        case CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE: {
          const { wsName } = operation.value || {};

          if (typeof wsName === 'string') {
            createWorkspace(wsName, WorkspaceType.browser, {})
              .then((r) => {
                (window as any).fathom?.trackGoal('AISLCLRF', 0);
              })
              .catch((error) => {
                dispatch({
                  name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
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
                CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
            );
          }
          return true;
        }

        case CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE: {
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
                  name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
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
                CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
            );
          }
          return true;
        }

        default: {
          return false;
        }
      }
    },
    [dispatch, createWorkspace],
  );

  const onDismiss = useCallback(
    (focusEditor = true) => {
      dispatch({
        name: 'action::@bangle.io/ui-context:DISMISS_MODAL',
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

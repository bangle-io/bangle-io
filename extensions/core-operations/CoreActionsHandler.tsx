import React, { useCallback } from 'react';

import { useBangleStoreContext } from '@bangle.io/app-state-context';
import {
  CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
  CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
} from '@bangle.io/constants';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { useSerialOperationHandler } from '@bangle.io/serial-operation-context';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { createWorkspace, WorkspaceType } from '@bangle.io/workspaces';

import { NewNoteInputModal, RenameNoteInputModal } from './NewNoteInputModal';

export function CoreActionsHandler() {
  const { dispatch, modal, modalValue } = useUIManagerContext();
  const { primaryEditor } = useEditorManagerContext();

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

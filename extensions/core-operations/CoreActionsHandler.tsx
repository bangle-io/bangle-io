import React, { useCallback } from 'react';

import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { useUIManagerContext } from '@bangle.io/slice-ui';

import { NewNoteInputModal, RenameNoteInputModal } from './NewNoteInputModal';

export function CoreActionsHandler() {
  const { dispatch, modal, modalValue } = useUIManagerContext();
  const { primaryEditor } = useEditorManagerContext();

  const onDismiss = useCallback(
    (focusEditor = true) => {
      dispatch({
        name: 'action::@bangle.io/slice-ui:DISMISS_MODAL',
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

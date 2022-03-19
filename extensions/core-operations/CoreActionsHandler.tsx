import React, { useCallback } from 'react';

import { useEditorManagerContext } from '@bangle.io/slice-editor-manager';
import { useUIManagerContext } from '@bangle.io/slice-ui';

import { NewNoteInputModal, RenameNoteInputModal } from './NewNoteInputModal';

export function CoreActionsHandler() {
  const { dispatch, dialogName, dialogMetadata } = useUIManagerContext();
  const { primaryEditor } = useEditorManagerContext();

  const onDismiss = useCallback(
    (focusEditor = true) => {
      dispatch({
        name: 'action::@bangle.io/slice-ui:DISMISS_DIALOG',
        value: {
          dialogName: ['new-note-modal', 'rename-note-modal'],
        },
      });
      if (focusEditor) {
        primaryEditor?.focusView();
      }
    },
    [primaryEditor, dispatch],
  );

  if (dialogName === 'new-note-modal') {
    return (
      <NewNoteInputModal
        onDismiss={onDismiss}
        initialValue={dialogMetadata?.initialValue}
      />
    );
  }

  if (dialogName === 'rename-note-modal') {
    return <RenameNoteInputModal onDismiss={onDismiss} />;
  }

  return null;
}

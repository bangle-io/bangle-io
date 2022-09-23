import React, { useCallback } from 'react';

import { ui, useSerialOperationContext } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';
import { getEditorIssue } from '@bangle.io/slice-notification';

import { EditorIssueButton } from './EditorIssueButton';

export function EditorIssue({
  wsPath,
  editorId,
}: {
  wsPath?: string;
  editorId: EditorIdType;
}) {
  const bangleStore = useBangleStoreContext();

  const editorIssue = wsPath && getEditorIssue(wsPath)(bangleStore.state);

  const { dispatchSerialOperation } = useSerialOperationContext();

  const onPressEditorIssue = useCallback(() => {
    if (!editorIssue) {
      return;
    }

    const { serialOperation } = editorIssue;

    if (serialOperation) {
      dispatchSerialOperation({ name: serialOperation });
    } else {
      ui.showGenericErrorModal({
        title: editorIssue.title,
        description: editorIssue.description,
      })(bangleStore.state, bangleStore.dispatch);
    }
  }, [bangleStore, dispatchSerialOperation, editorIssue]);

  return (
    <div>
      {editorIssue && (
        <EditorIssueButton
          editorIssue={editorIssue}
          widescreen={false}
          onPress={onPressEditorIssue}
        />
      )}
    </div>
  );
}

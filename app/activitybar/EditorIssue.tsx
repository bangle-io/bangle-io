import React, { useCallback } from 'react';

import { ui, useSerialOperationContext } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';
import { getEditorIssue } from '@bangle.io/slice-notification';
import { cx } from '@bangle.io/utils';

import { EditorIssueButton } from './EditorIssueButton';

export function EditorIssue({
  wsPath,
  editorId,
  className,
}: {
  wsPath?: string;
  editorId: EditorIdType;
  className?: string;
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

  return editorIssue ? (
    <div className={cx('relative w-full', className)}>
      <div className="absolute inset-x-0 mx-auto rounded-md w-full flex flex-col gap-1 items-center">
        <EditorIssueButton
          editorIssue={editorIssue}
          widescreen={false}
          onPress={onPressEditorIssue}
        />
      </div>
    </div>
  ) : null;
}

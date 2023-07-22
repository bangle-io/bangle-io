import React, { useCallback, useState } from 'react';

import { nsmApi2, useNsmSliceDispatch, useNsmSliceState } from '@bangle.io/api';
import { Dialog } from '@bangle.io/ui-components';

import { DISCARD_LOCAL_CHANGES_DIALOG } from '../common';
import { nsmGhSlice, operations } from '../state';

export function DiscardLocalChangesDialog() {
  const [isProcessing, updateIsProcessing] = useState(false);
  const [manuallyReload, updateManuallyReload] = useState(false);

  const { githubWsName } = useNsmSliceState(nsmGhSlice);

  const dispatch = useNsmSliceDispatch(nsmGhSlice);

  const dismiss = useCallback(() => {
    if (!isProcessing) {
      nsmApi2.ui.dismissDialog(DISCARD_LOCAL_CHANGES_DIALOG);
    }
  }, [isProcessing]);

  if (manuallyReload) {
    return (
      <Dialog
        isDismissable={false}
        headingTitle="Confirm discarding of local changes"
        onDismiss={() => {}}
      >
        Please reload the application manually.
      </Dialog>
    );
  }

  if (!githubWsName) {
    return (
      <Dialog
        isDismissable
        onDismiss={() => {
          dismiss();
        }}
        headingTitle="Not a Github workspace"
      >
        This action can only occur in a workspace that is stored in Github.
        Please open one and try again.
      </Dialog>
    );
  }

  return (
    <Dialog
      isDismissable
      headingTitle="Confirm discarding of local changes"
      isLoading={isProcessing}
      primaryButtonConfig={{
        isDestructive: true,
        text: 'Discard',
        onPress: async () => {
          if (isProcessing) {
            return;
          }
          if (githubWsName) {
            updateIsProcessing(true);

            dispatch(operations.discardLocalChanges(githubWsName, true));

            dismiss();
          }
        },
      }}
      onDismiss={() => {
        dismiss();
      }}
    >
      Are you sure you want to discard all your local changes? This action
      cannot be undone and may result in a <b>loss of any unsaved changes</b>.
    </Dialog>
  );
}

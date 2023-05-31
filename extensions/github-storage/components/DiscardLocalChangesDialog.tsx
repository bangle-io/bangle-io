import React, { useCallback, useState } from 'react';

import { nsmApi2, useBangleStoreContext, useSliceState } from '@bangle.io/api';
import { Dialog } from '@bangle.io/ui-components';

import { DISCARD_LOCAL_CHANGES_DIALOG, ghSliceKey } from '../common';
import { discardLocalChanges } from '../operations';

export function DiscardLocalChangesDialog() {
  const bangleStore = useBangleStoreContext();

  const [isProcessing, updateIsProcessing] = useState(false);
  const [manuallyReload, updateManuallyReload] = useState(false);

  const {
    sliceState: { githubWsName },
  } = useSliceState(ghSliceKey);

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

            const success = await ghSliceKey.callAsyncOp(
              bangleStore,
              discardLocalChanges(githubWsName),
            );

            if (success) {
              window.location.reload();
              // if we reach here ask user to reload manually
              setTimeout(() => {
                updateManuallyReload(true);
              }, 2000);
            }

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

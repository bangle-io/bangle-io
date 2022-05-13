import React, { useCallback, useState } from 'react';

import { ui, workspace } from '@bangle.io/api';
import { Dialog } from '@bangle.io/ui-components';

import { DISCARD_LOCAL_CHANGES_DIALOG } from '../common';
import { localFileEntryManager } from '../file-entry-manager';
import {
  discardLocalChanges,
  isCurrentWorkspaceGithubStored,
} from '../operations';

export function DiscardLocalChangesDialog() {
  const { bangleStore } = ui.useUIManagerContext();
  const wsName = workspace.getWsName()(bangleStore.state);

  const [isProcessing, updateIsProcessing] = useState(false);
  const [manuallyReload, updateManuallyReload] = useState(false);

  const isGithubWorkspace = wsName
    ? isCurrentWorkspaceGithubStored(wsName)(bangleStore.state)
    : false;

  const dismiss = useCallback(() => {
    if (!isProcessing) {
      ui.dismissDialog(DISCARD_LOCAL_CHANGES_DIALOG)(
        bangleStore.state,
        bangleStore.dispatch,
      );
    }
  }, [bangleStore, isProcessing]);

  if (manuallyReload) {
    return (
      <Dialog
        isDismissable
        headingTitle="Not a Github workspace"
        onDismiss={() => {
          dismiss();
        }}
      >
        Please reload the application manually.
      </Dialog>
    );
  }

  if (!isGithubWorkspace || !wsName) {
    return (
      <Dialog
        isDismissable={false}
        onDismiss={() => {}}
        headingTitle="Confirm discarding of local changes"
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
          if (wsName) {
            updateIsProcessing(true);
            await discardLocalChanges(wsName, localFileEntryManager)(
              bangleStore.state,
              bangleStore.dispatch,
              bangleStore,
            );
            window.location.reload();

            // if we reach here ask user to reload manually
            setTimeout(() => {
              updateManuallyReload(true);
            }, 2000);
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

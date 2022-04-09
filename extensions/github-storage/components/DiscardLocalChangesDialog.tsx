import React, { useCallback, useEffect, useState } from 'react';

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

  const [isGithubWorkspace, updateIsGithubWorkspace] = useState(
    isCurrentWorkspaceGithubStored()(bangleStore.state),
  );

  const dismiss = useCallback(() => {
    if (!isProcessing) {
      ui.dismissDialog(DISCARD_LOCAL_CHANGES_DIALOG)(
        bangleStore.state,
        bangleStore.dispatch,
      );
    }
  }, [bangleStore, isProcessing]);

  useEffect(() => {
    if (wsName) {
      updateIsGithubWorkspace(
        isCurrentWorkspaceGithubStored()(bangleStore.state),
      );
    }
  }, [bangleStore, wsName, isGithubWorkspace]);

  if (!isGithubWorkspace || !wsName) {
    return (
      <Dialog
        isDismissable
        headingTitle="Not a Github workspace"
        onClose={() => {
          dismiss();
        }}
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
          }
        },
      }}
      onClose={() => {
        dismiss();
      }}
    >
      Are you sure you want to discard all your local changes? This action
      cannot be undone and may result in a <b>loss of any unsaved changes</b>.
    </Dialog>
  );
}

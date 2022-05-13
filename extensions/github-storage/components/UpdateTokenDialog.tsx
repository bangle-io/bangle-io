import React, { useCallback, useState } from 'react';

import { notification, ui, workspace } from '@bangle.io/api';
import { Dialog, ErrorBanner, TextField } from '@bangle.io/ui-components';
import { BaseError } from '@bangle.io/utils';

import { UPDATE_GITHUB_TOKEN_DIALOG } from '../common';
import { ALLOWED_GH_SCOPES, hasValidGithubScope } from '../github-api-helpers';
import {
  isCurrentWorkspaceGithubStored,
  readGithubTokenFromStore,
  updateGithubToken,
} from '../operations';

export function UpdateTokenDialog() {
  const { bangleStore } = ui.useUIManagerContext();
  const wsName = workspace.getWsName()(bangleStore.state);
  const [inputToken, updateInputToken] = useState<string | undefined>(() => {
    return readGithubTokenFromStore()(bangleStore.state);
  });
  const isGithubWorkspace = wsName
    ? isCurrentWorkspaceGithubStored(wsName)(bangleStore.state)
    : false;
  const [error, updateError] = useState<Error | undefined>(undefined);
  const [isProcessing, updateIsProcessing] = useState(false);
  const dismiss = useCallback(() => {
    if (!isProcessing) {
      ui.dismissDialog(UPDATE_GITHUB_TOKEN_DIALOG)(
        bangleStore.state,
        bangleStore.dispatch,
      );
    }
  }, [bangleStore, isProcessing]);

  const verifyAndUpdateToken = useCallback(async () => {
    if (isProcessing || !inputToken || !wsName) {
      return;
    }
    updateIsProcessing(true);
    updateError(undefined);
    try {
      const validToken = await hasValidGithubScope({ token: inputToken });
      updateIsProcessing(false);

      if (!validToken) {
        updateError(
          new Error(
            `Bangle.io requires the one of the following scopes: ${ALLOWED_GH_SCOPES.join(
              ', ',
            )}`,
          ),
        );
      }

      updateGithubToken(wsName, inputToken)(
        bangleStore.state,
        bangleStore.dispatch,
      );

      notification.showNotification({
        title: 'Github token updated',
        uid: 'github-token-updated' + Date.now(),
      })(bangleStore.state, bangleStore.dispatch);

      dismiss();
    } catch (e) {
      updateIsProcessing(false);

      if (e instanceof BaseError) {
        updateError(e);
      } else {
        throw e;
      }
    }
  }, [isProcessing, dismiss, bangleStore, inputToken, wsName]);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        verifyAndUpdateToken();
      }
      if (e.key === 'Escape') {
        dismiss();
      }
    },
    [verifyAndUpdateToken, dismiss],
  );

  if (!isGithubWorkspace || !wsName) {
    return (
      <Dialog
        isDismissable={false}
        onDismiss={() => {}}
        headingTitle="Update Github token"
      >
        This action can only occur in a workspace that is stored in Github.
        Please open one and try again.
      </Dialog>
    );
  }

  return (
    <Dialog
      isDismissable
      headingTitle="Update Github token"
      isLoading={isProcessing}
      primaryButtonConfig={{
        text: 'Update',
        onPress: verifyAndUpdateToken,
      }}
      onDismiss={() => {
        dismiss();
      }}
    >
      <div>
        {error && <ErrorBanner title="Error" content={error.message} />}
        The token will be safely stored in your browser's local storage.
        <div className="my-4">
          <TextField
            autoComplete="off"
            spellCheck={false}
            onKeyDown={onKeyDown}
            placeholder="Github personal access token"
            label="Token"
            value={inputToken}
            onChange={(val) => {
              updateInputToken(val);
            }}
          />
        </div>
      </div>
    </Dialog>
  );
}

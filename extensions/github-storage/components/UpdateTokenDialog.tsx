import React, { useCallback, useEffect, useState } from 'react';

import { nsmApi2, useNsmSliceDispatch, useNsmSliceState } from '@bangle.io/api';
import { Dialog, ErrorBanner, TextField } from '@bangle.io/ui-components';
import { BaseError } from '@bangle.io/utils';

import { UPDATE_GITHUB_TOKEN_DIALOG } from '../common';
import { getGhToken } from '../database';
import { ALLOWED_GH_SCOPES, hasValidGithubScope } from '../github-api-helpers';
import { nsmGhSlice, operations } from '../state';

export function UpdateTokenDialog() {
  const [inputToken, updateInputToken] = useState<string | undefined>();
  const [error, updateError] = useState<Error | undefined>(undefined);
  const [isProcessing, updateIsProcessing] = useState(false);

  const { githubWsName } = useNsmSliceState(nsmGhSlice);
  const nsmDispatch = useNsmSliceDispatch(nsmGhSlice);

  useEffect(() => {
    getGhToken().then((token) => {
      if (token) {
        updateInputToken(token);
      }
    });
  }, []);

  const dismiss = useCallback(() => {
    if (!isProcessing) {
      nsmApi2.ui.dismissDialog(UPDATE_GITHUB_TOKEN_DIALOG);
    }
  }, [isProcessing]);

  const verifyAndUpdateToken = useCallback(async () => {
    if (isProcessing || !inputToken || !githubWsName) {
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

      nsmDispatch(operations.updateGithubToken(githubWsName, inputToken));

      nsmApi2.ui.showNotification({
        title: 'Github token updated',
        uid: 'github-token-updated' + Date.now(),
      });

      dismiss();
    } catch (e) {
      updateIsProcessing(false);

      if (e instanceof BaseError) {
        updateError(e);
      } else {
        throw e;
      }
    }
  }, [isProcessing, dismiss, nsmDispatch, inputToken, githubWsName]);

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

  if (!githubWsName) {
    return (
      <Dialog
        isDismissable
        onDismiss={dismiss}
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

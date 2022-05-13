import React, { useCallback, useState } from 'react';

import { ui } from '@bangle.io/api';
import {
  Dialog,
  ErrorBanner,
  ExternalLink,
  GithubIcon,
  TextField,
} from '@bangle.io/ui-components';
import { useDebouncedValue } from '@bangle.io/utils';

import {
  NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG,
  NEW_GITHUB_WORKSPACE_TOKEN_DIALOG,
} from '../common';
import { ALLOWED_GH_SCOPES, hasValidGithubScope } from '../github-api-helpers';
import { readGithubTokenFromStore } from '../operations';

const MIN_HEIGHT = 200;

export function NewGithubWorkspaceTokenDialog() {
  const { bangleStore } = ui.useUIManagerContext();

  const [inputToken, updateInputToken] = useState<string | undefined>(() => {
    return readGithubTokenFromStore()(bangleStore.state);
  });
  const [isLoading, updateIsLoading] = useState(false);
  const [error, updateError] = useState<Error | undefined>(undefined);

  const deferredIsLoading = useDebouncedValue(isLoading, { wait: 100 });

  const onNext = useCallback(async () => {
    if (!inputToken) {
      return;
    }
    try {
      updateIsLoading(true);
      updateError(undefined);

      if (!(await hasValidGithubScope({ token: inputToken }))) {
        throw new Error(
          `Bangle.io requires the one of the following scopes: ${ALLOWED_GH_SCOPES.join(
            ', ',
          )}`,
        );
      }

      ui.showDialog(NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG, {
        githubToken: inputToken,
      })(bangleStore.state, bangleStore.dispatch);
    } catch (error) {
      if (error instanceof Error) {
        updateError(error);
      }
    } finally {
      updateIsLoading(false);
    }
  }, [bangleStore, inputToken]);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        onNext();
      }
    },
    [onNext],
  );

  return (
    <Dialog
      isDismissable
      headingTitle="Github workspace"
      dismissText="Cancel"
      isLoading={deferredIsLoading}
      primaryButtonConfig={{
        text: 'Next',
        disabled: !inputToken || inputToken.length === 0,
        onPress: onNext,
      }}
      onDismiss={() => {
        ui.dismissDialog(NEW_GITHUB_WORKSPACE_TOKEN_DIALOG)(
          bangleStore.state,
          bangleStore.dispatch,
        );
      }}
      headingIcon={<GithubIcon className="w-8 h-8" />}
      footer={
        <ExternalLink
          text="How to create a personal access Github token?"
          href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
        />
      }
    >
      <div style={{ minHeight: MIN_HEIGHT }}>
        {error && <ErrorBanner title={`Error`} content={error.message} />}
        Please provide a personal access token for communicating with Github.
        The token will be safely stored in your browser's local storage.
        <div className="my-4">
          <TextField
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

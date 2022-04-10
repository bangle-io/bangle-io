import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ui } from '@bangle.io/api';
import {
  Dialog,
  ErrorBanner,
  ExternalLink,
  GithubIcon,
  Input,
} from '@bangle.io/ui-components';
import { useDebouncedValue } from '@bangle.io/utils';

import {
  NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG,
  NEW_GITHUB_WORKSPACE_TOKEN_DIALOG,
} from '../common';
import { getRepos, getScopes, RepositoryInfo } from '../github-api-helpers';
import { readGithubTokenFromStore } from '../operations';

const GH_SCOPES = ['repo', 'public_repo'];

export function NewGithubWorkspaceTokenDialog() {
  const ref = useRef<HTMLInputElement>(null);
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
      let scope = await getScopes({ token: inputToken });

      if (
        !scope ||
        !scope
          .split(',')
          .map((s) => s.trim())
          .some((s) => GH_SCOPES.includes(s))
      ) {
        throw new Error(
          `Bangle.io requires the one of the following scopes: ${GH_SCOPES.join(
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
      {error && <ErrorBanner title={`Error`} content={error.message} />}
      Create a workspace that will be synced with your Github repository.
      <div className="my-4">
        <Input
          autoCapitalize={false}
          spellCheck={false}
          autoCorrect={false}
          className="w-full"
          onKeyDown={onKeyDown}
          placeholder="Github personal access token"
          label="Github token"
          value={inputToken}
          ref={ref}
          onChange={(e) => {
            updateInputToken(e.target.value);
          }}
        />
      </div>
      The token will be safely stored in your browser's local storage.
    </Dialog>
  );
}

export function NewGithubWorkspaceRepoPickerDialog() {
  const { bangleStore, dialogName, dialogMetadata } = ui.useUIManagerContext();
  const [isLoading, updateIsLoading] = useState(false);
  const deferredIsLoading = useDebouncedValue(isLoading, { wait: 100 });
  const [error, updateError] = useState<Error | undefined>(undefined);
  const [repoList, updateRepoList] = useState<RepositoryInfo[]>([]);

  const githubToken =
    typeof dialogMetadata?.githubToken === 'string'
      ? dialogMetadata.githubToken
      : undefined;

  const onCreate = useCallback(async () => {}, []);

  useEffect(() => {
    if (!githubToken) {
      ui.dismissDialog(NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG)(
        bangleStore.state,
        bangleStore.dispatch,
      );
    }
  }, [githubToken, bangleStore]);

  useEffect(() => {
    let destroyed = false;

    (async () => {
      if (githubToken) {
        try {
          updateIsLoading(true);
          let repoIterator = getRepos({ token: githubToken });
          for await (const repos of repoIterator) {
            if (!destroyed) {
              updateRepoList(repos);
            }
          }
        } catch (error) {
          if (error instanceof Error) {
            updateError(error);
          }
        } finally {
          updateIsLoading(false);
        }
      }
    })();

    return () => {
      destroyed = true;
    };
  }, [githubToken, bangleStore]);

  if (!githubToken) {
    return null;
  }

  return (
    <Dialog
      isDismissable
      headingTitle="Github workspace"
      dismissText="Cancel"
      isLoading={deferredIsLoading}
      primaryButtonConfig={{
        text: 'Create',
        disabled: true,
        onPress: () => {},
      }}
      onDismiss={() => {
        ui.dismissDialog(NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG)(
          bangleStore.state,
          bangleStore.dispatch,
        );
      }}
      headingIcon={<GithubIcon className="w-8 h-8" />}
    >
      Welcome to repo picker
      <div
        className="overflow-y-scroll"
        style={{
          maxHeight: 'min(50vh, 500px)',
          minHeight: 'min(50vh, 500px)',
        }}
      >
        <ul>
          {repoList.map((repo) => (
            <li key={`${repo.owner}/${repo.name}`}>
              {repo.owner}/{repo.name}
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

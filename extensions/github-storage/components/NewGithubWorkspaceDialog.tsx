import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ui, workspace } from '@bangle.io/api';
import {
  ComboBox,
  Dialog,
  ErrorBanner,
  ExternalLink,
  GithubIcon,
  Item,
  Section,
  TextField,
} from '@bangle.io/ui-components';
import { useDebouncedValue } from '@bangle.io/utils';

import {
  NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG,
  NEW_GITHUB_WORKSPACE_TOKEN_DIALOG,
} from '../common';
import { getRepos, getScopes, RepositoryInfo } from '../github-api-helpers';
import { readGithubTokenFromStore } from '../operations';

const GH_SCOPES = ['repo', 'public_repo'];

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
      <div style={{ minHeight: MIN_HEIGHT }}>
        {error && <ErrorBanner title={`Error`} content={error.message} />}
        Please provide a personal access token for communicating with Github.
        The token will be safely stored in your browser's local storage.
        <div className="my-4">
          <TextField
            onKeyDown={onKeyDown}
            placeholder="Github personal access token"
            label="Token"
            value={inputToken}
            onChange={(e) => {
              updateInputToken(e);
            }}
          />
        </div>
      </div>
    </Dialog>
  );
}

export function NewGithubWorkspaceRepoPickerDialog() {
  const { bangleStore, dialogMetadata } = ui.useUIManagerContext();
  const [isLoading, updateIsLoading] = useState(false);
  const deferredIsLoading = useDebouncedValue(isLoading, { wait: 100 });
  const [error, updateError] = useState<Error | undefined>(undefined);
  const [repoList, updateRepoList] = useState<RepositoryInfo[]>([]);
  const [selectedRepo, updateSelectedRepo] = useState<
    RepositoryInfo | undefined
  >();

  const onDismiss = useCallback(() => {
    ui.dismissDialog(NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG)(
      bangleStore.state,
      bangleStore.dispatch,
    );
  }, [bangleStore]);

  const githubToken =
    typeof dialogMetadata?.githubToken === 'string'
      ? dialogMetadata.githubToken
      : undefined;

  const onCreate = useCallback(async () => {
    if (!selectedRepo) {
      return;
    }
    try {
      updateIsLoading(true);
      await workspace.createWorkspace(selectedRepo.name, 'github-storage', {
        githubToken: githubToken,
        owner: selectedRepo.owner,
        branch: selectedRepo.branch,
      })(bangleStore.state, bangleStore.dispatch, bangleStore);
      (window as any).fathom?.trackGoal('JSUCQKTL', 0);
      onDismiss();
    } catch (error) {
      if (error instanceof Error) {
        updateError(error);
        updateIsLoading(false);
      }
    }
  }, [onDismiss, selectedRepo, githubToken, bangleStore]);

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

  const groupedItems = useMemo(() => {
    return Array.from(
      Object.entries(
        repoList.reduce((prev, cur) => {
          let array = prev[cur.owner] || [];
          prev[cur.owner] = array;
          array.push(cur);

          return prev;
        }, {} as { [key: string]: RepositoryInfo[] }),
      ),
    );
  }, [repoList]);

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
        text: 'Open',
        disabled: !Boolean(selectedRepo),
        onPress: onCreate,
      }}
      onDismiss={onDismiss}
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
        Please pick a repository that will be used to store your notes.
        <div className="my-4">
          <ComboBox
            size="full"
            label="Select repository"
            menuTrigger="focus"
            onKeyUp={(e) => {
              if (e.key === 'Enter') {
                onCreate();
              }
            }}
            onSelectionChange={(key) => {
              if (typeof key === 'string') {
                const [owner, name] = key.split('/');
                updateSelectedRepo(
                  repoList.find((r) => r.owner === owner && r.name === name),
                );
              } else {
                updateSelectedRepo(undefined);
              }
            }}
          >
            {groupedItems.map(([owner, repos]) => (
              <Section key={owner} title={owner}>
                {repos.map((repo) => (
                  <Item
                    key={`${repo.owner}/${repo.name}`}
                    textValue={`${repo.owner}/${repo.name}`}
                  >
                    {repo.owner}/{repo.name}
                  </Item>
                ))}
              </Section>
            ))}
          </ComboBox>
        </div>
      </div>
    </Dialog>
  );
}

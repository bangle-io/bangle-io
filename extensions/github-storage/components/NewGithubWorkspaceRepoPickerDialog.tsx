import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { nsmApi2, useBangleStoreContext, workspace } from '@bangle.io/api';
import {
  ComboBox,
  Dialog,
  ErrorBanner,
  ExternalLink,
  GithubIcon,
  Item,
  Section,
} from '@bangle.io/ui-components';
import { useDebouncedValue } from '@bangle.io/utils';

import {
  GITHUB_STORAGE_PROVIDER_NAME,
  NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG,
} from '../common';
import type { RepositoryInfo } from '../github-api-helpers';
import { getRepos } from '../github-api-helpers';

const MIN_HEIGHT = 200;

export function NewGithubWorkspaceRepoPickerDialog() {
  const bangleStore = useBangleStoreContext();
  const { dialogMetadata } = nsmApi2.ui.useUi();
  const [isLoading, updateIsLoading] = useState(false);
  const deferredIsLoading = useDebouncedValue(isLoading, { wait: 100 });
  const [error, updateError] = useState<Error | undefined>(undefined);
  const [repoList, updateRepoList] = useState<RepositoryInfo[]>([]);
  const [selectedRepo, updateSelectedRepo] = useState<
    RepositoryInfo | undefined
  >();

  const onDismiss = useCallback(() => {
    nsmApi2.ui.dismissDialog(NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG);
  }, []);

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
      await workspace.createWorkspace(
        selectedRepo.name,
        GITHUB_STORAGE_PROVIDER_NAME,
        {
          githubToken: githubToken,
          owner: selectedRepo.owner,
          branch: selectedRepo.branch,
        },
      )(bangleStore.state, bangleStore.dispatch, bangleStore);
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
      nsmApi2.ui.dismissDialog(NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG);
    }
  }, [githubToken]);

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
        repoList.reduce<{ [key: string]: RepositoryInfo[] }>((prev, cur) => {
          let array = prev[cur.owner] || [];
          prev[cur.owner] = array;
          array.push(cur);

          return prev;
        }, {}),
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

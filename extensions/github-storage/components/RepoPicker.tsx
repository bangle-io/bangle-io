import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  notification,
  useBangleStoreContext,
  useSerialOperationContext,
  workspace,
} from '@bangle.io/api';
import {
  PaletteOnExecuteItem,
  UniversalPalette,
} from '@bangle.io/ui-components';

import { getRepos, RepositoryInfo } from '../github-api-helpers';
import { readGithubTokenFromStore, updateGithubToken } from '../operations';
import { TokenInput } from './TokenInput';

export function RepoPicker({ onDismiss }: { onDismiss: () => void }) {
  const bangleStore = useBangleStoreContext();
  const [githubToken, _updateGithubToken] = useState<string | undefined>(() => {
    return readGithubTokenFromStore()(bangleStore.state);
  });
  const [query, updateQuery] = useState('');
  const [repoList, updateRepoList] = useState<RepositoryInfo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { dispatchSerialOperation } = useSerialOperationContext();

  const items = useMemo(() => {
    return repoList
      .map((repo) => ({
        uid: (repo.owner + '/' + repo.name).toLocaleLowerCase(),
        title: repo.name,
        description: repo.description,
        extraInfo: repo.owner,
        data: repo,
      }))
      .filter((r) => {
        if (!query) {
          return true;
        }
        let lowerQuery = query.toLocaleLowerCase();

        return r.uid.includes(lowerQuery);
      });
  }, [repoList, query]);

  useEffect(() => {
    let destroyed = false;

    (async () => {
      if (githubToken) {
        try {
          let repoIterator = getRepos({ token: githubToken });
          for await (const repos of repoIterator) {
            if (!destroyed) {
              updateRepoList(repos);
            }
          }
        } catch (e) {
          if (destroyed) {
            return;
          }
          onDismiss();

          if (e instanceof Error) {
            if (e.message.includes('Bad credentials')) {
              updateGithubToken(undefined)(
                bangleStore.state,
                bangleStore.dispatch,
              );
            }
            notification.showNotification({
              uid: 'failure-list-repos',
              title: 'Unable to list repos',
              content: e.message,
              severity: 'error',
            })(bangleStore.state, bangleStore.dispatch);
          }
        }
      }
    })();

    return () => {
      destroyed = true;
    };
  }, [githubToken, onDismiss, bangleStore, dispatchSerialOperation]);

  const onExecuteItem = useCallback<PaletteOnExecuteItem>(
    (getItemUid) => {
      onDismiss();
      const uid = getItemUid(items);
      const matchingRepo = items.find((r) => r.uid === uid)?.data;

      if (matchingRepo) {
        workspace
          .createWorkspace(matchingRepo.name, 'github-storage', {
            githubToken: githubToken,
            owner: matchingRepo.owner,
            branch: matchingRepo.branch,
          })(bangleStore.state, bangleStore.dispatch, bangleStore)
          .then(() => {
            (window as any).fathom?.trackGoal('JSUCQKTL', 0);
          })
          .catch((error) => {
            const notificationStore =
              notification.notificationSliceKey.getStore(bangleStore);
            notification.showNotification({
              severity: 'error',
              uid: 'error-create-workspace-github',
              title: 'Unable to create workspace ',
              content: error.displayMessage || error.message,
            })(notificationStore.state, notificationStore.dispatch);
          });
      }
    },
    [onDismiss, items, githubToken, bangleStore],
  );

  const { inputProps, resetCounter, counter, onSelect } =
    UniversalPalette.usePaletteDriver(onDismiss, onExecuteItem);

  useEffect(() => {
    let destroyed = false;
    requestAnimationFrame(() => {
      if (!destroyed) {
        document
          .querySelector<HTMLInputElement>(
            '.B-ui-components_universal-palette-container input',
          )
          ?.focus();
      }
    });

    return () => {
      destroyed = true;
    };
  }, []);

  useEffect(() => {
    resetCounter();
  }, [query, resetCounter]);

  const getActivePaletteItem = useCallback(
    (items) => {
      return items[UniversalPalette.getActiveIndex(counter, items.length)];
    },
    [counter],
  );
  const activeItem = getActivePaletteItem(items);

  if (!githubToken) {
    return (
      <TokenInput onDismiss={onDismiss} updateToken={_updateGithubToken} />
    );
  }

  return (
    <UniversalPalette.PaletteContainer
      paletteType="github-repo-picker"
      onClickOutside={onDismiss}
      onClickInside={() => {
        document
          .querySelector<HTMLInputElement>(
            '.B-ui-components_universal-palette-container input',
          )
          ?.focus();
      }}
    >
      <UniversalPalette.PaletteInput
        // leftNode={Palette.icon}
        placeholder="Search for a repository"
        inputValue={query}
        onInputValueChange={updateQuery}
        ref={inputRef}
        {...inputProps}
      />
      <UniversalPalette.PaletteItemsContainer>
        {items.map((item) => {
          return (
            <UniversalPalette.PaletteItemUI
              key={item.uid}
              item={item}
              onClick={onSelect}
              isActive={activeItem === item}
            />
          );
        })}
      </UniversalPalette.PaletteItemsContainer>
      <UniversalPalette.PaletteInfo>
        <UniversalPalette.PaletteInfoItem>
          use:
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Open selected workspace
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </UniversalPalette.PaletteContainer>
  );
}

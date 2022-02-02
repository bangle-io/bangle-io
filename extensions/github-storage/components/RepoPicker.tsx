import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import type { UnPromisify } from '@bangle.io/shared-types';
import {
  notificationSliceKey,
  showNotification,
} from '@bangle.io/slice-notification';
import { createWorkspace } from '@bangle.io/slice-workspace';
import {
  PaletteOnExecuteItem,
  UniversalPalette,
} from '@bangle.io/ui-components';

import { getRepos, RepositoryInfo } from '../github-api-helpers';

export function RepoPicker({
  onDismiss,
  githubToken,
}: {
  githubToken: string;
  onDismiss: (clear?: boolean) => void;
}) {
  const store = useBangleStoreContext();

  const [query, updateQuery] = useState('');
  const [repoList, updateRepoList] = useState<RepositoryInfo[]>([]);
  console.log(repoList.length);
  const inputRef = useRef<HTMLInputElement>(null);
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
    (async () => {
      try {
        console.log('called');
        let repoIterator = getRepos({ githubToken });
        for await (const repos of repoIterator) {
          updateRepoList(repos);
        }
      } catch (e) {
        onDismiss(true);
        if (e instanceof Error) {
          store.errorHandler(e);
        }
      }
    })();
  }, [githubToken, onDismiss, store]);

  const onExecuteItem = useCallback<PaletteOnExecuteItem>(
    (getItemUid) => {
      onDismiss();
      const uid = getItemUid(items);
      const matchingRepo = items.find((r) => r.uid === uid)?.data;
      if (matchingRepo) {
        createWorkspace(matchingRepo.name, 'github-storage', {
          githubToken: githubToken,
          owner: matchingRepo.owner,
          branch: matchingRepo.branch,
        })(store.state, store.dispatch, store).catch((error) => {
          showNotification({
            severity: 'error',
            uid: 'error-create-workspace-github',
            title: 'Unable to create workspace ',
            content: error.displayMessage || error.message,
          })(
            notificationSliceKey.getState(store.state),
            notificationSliceKey.getDispatch(store.dispatch),
          );
        });
      }
    },
    [onDismiss, items, githubToken, store],
  );

  const { inputProps, updateCounter, resetCounter, counter, onSelect } =
    UniversalPalette.usePaletteDriver(onDismiss, onExecuteItem);

  useEffect(() => {
    let destroyed = false;
    requestAnimationFrame(() => {
      if (!destroyed) {
        document
          .querySelector<HTMLInputElement>('.universal-palette-container input')
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

  return (
    <UniversalPalette.PaletteContainer
      paletteType="github-repo-picker"
      onClickOutside={onDismiss}
      onClickInside={() => {
        document
          .querySelector<HTMLInputElement>('.universal-palette-container input')
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

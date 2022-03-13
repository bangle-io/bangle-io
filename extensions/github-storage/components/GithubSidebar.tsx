import React, { useEffect, useState } from 'react';

import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { LocalFileEntry } from '@bangle.io/remote-file-sync/local-file-entry-manager';
import {
  getStorageProvider,
  pushWsPath,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { Sidebar } from '@bangle.io/ui-components';
import { cx, shallowCompareArray } from '@bangle.io/utils';
import {
  isValidNoteWsPath,
  OpenedWsPaths,
  resolvePath,
} from '@bangle.io/ws-path';

import { GITHUB_STORAGE_PROVIDER_NAME } from '../common';
import { GithubStorageProvider } from '../github-storage-provider';

const LOG = true;

const log = LOG ? console.info.bind(console, 'GithubSidebar') : () => {};

export function GithubSidebar() {
  const store = useBangleStoreContext();
  const { wsName, openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
    store.state,
  );

  const [storageProvider, updateStorageProvider] = useState<
    undefined | GithubStorageProvider
  >();

  useEffect(() => {
    const storageProvider = wsName
      ? getStorageProvider()(store.state)
      : undefined;
    if (!storageProvider) {
      return;
    }
    if (storageProvider.name === GITHUB_STORAGE_PROVIDER_NAME) {
      updateStorageProvider(storageProvider as GithubStorageProvider);
    } else if (storageProvider) {
      updateStorageProvider(undefined);
    }
  }, [wsName, store]);

  return wsName ? (
    !storageProvider ? (
      <div className="pl-3">"{wsName}" is not a Github workspace</div>
    ) : (
      <ModifiedEntries
        storageProvider={storageProvider}
        wsName={wsName}
        openedWsPaths={openedWsPaths}
      />
    )
  ) : (
    <div className="pl-3">Please open a Github workspace</div>
  );
}

function ModifiedEntries({
  storageProvider,
  wsName,
  openedWsPaths,
}: {
  storageProvider: GithubStorageProvider;
  wsName: string;
  openedWsPaths: OpenedWsPaths;
}) {
  const store = useBangleStoreContext();
  const [modifiedEntries, updateModifiedEntries] = useState<
    undefined | LocalFileEntry[]
  >(undefined);

  useEffect(() => {
    let destroyed = false;
    (storageProvider as GithubStorageProvider).fileEntryManager
      .getAllEntries()
      .then((r) => {
        if (!destroyed) {
          const result = r.filter(
            (e) => e.uid.startsWith(wsName) && (e.isModified || e.isNew),
          );
          updateModifiedEntries((prevEntries) => {
            const newWsPaths = result.map((e) => e.uid);
            const oldWsPaths = prevEntries?.map((e) => e.uid) || [];
            if (!shallowCompareArray(newWsPaths, oldWsPaths)) {
              return result;
            }
            return prevEntries;
          });
        }
      });

    return () => {
      destroyed = true;
    };
  }, [wsName, store, storageProvider]);

  useEffect(() => {
    log('modifiedEntries', modifiedEntries);
  }, [modifiedEntries]);
  return !modifiedEntries || modifiedEntries.length === 0 ? (
    <div className="px-3">Nothing to sync</div>
  ) : (
    <div>
      <div className="px-4 my-4">
        <ActionButton
          allowFocus={false}
          onPress={() => {}}
          ariaLabel="Sync with Github repository"
          tooltip={<TooltipWrapper>Sync with Github repository</TooltipWrapper>}
          tooltipDelay={150}
          tooltipPlacement="bottom"
          className="w-full"
          variant="primary"
        >
          <ButtonContent
            size="medium"
            textClassName="text-center w-full"
            text="Sync"
          />
        </ActionButton>
      </div>
      <div className="px-3 text-sm">Files that need to be synced</div>
      <div className="">
        {modifiedEntries.map((r) => (
          <Sidebar.Row2
            key={r.uid}
            isActive={openedWsPaths.primaryWsPath === r.uid}
            className={'rounded text-sm truncate py-1 select-none pl-3'}
            extraInfoClassName="ml-1 text-sm"
            onClick={() => {
              if (isValidNoteWsPath(r.uid) && !r.deleted) {
                pushWsPath(r.uid)(store.state, store.dispatch);
              }
            }}
            item={{
              uid: r.uid,
              isDisabled: !isValidNoteWsPath(r.uid) || r.deleted ? true : false,
              showDividerAbove: false,
              title: `${r.deleted ? '(deleted)' : ''}  ${
                resolvePath(r.uid).filePath
              }`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

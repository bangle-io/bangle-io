import React, { useEffect, useState } from 'react';

import {
  useBangleStoreContext,
  useSerialOperationContext,
  workspace,
  wsPathHelpers,
} from '@bangle.io/api';
import { LocalFileEntry } from '@bangle.io/remote-file-sync/local-file-entry-manager';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { Sidebar } from '@bangle.io/ui-components';
import { shallowCompareArray, useInterval } from '@bangle.io/utils';

import { OPERATION_SYNC_GITHUB_CHANGES } from '../common';
import { localFileEntryManager } from '../file-entry-manager';
import { isGithubStorageProvider } from '../helpers';

const LOG = false;

const log = LOG ? console.info.bind(console, 'GithubSidebar') : () => {};

const REFRESH_INTERVAL = 3000;

export function GithubSidebar() {
  const store = useBangleStoreContext();
  const { wsName, openedWsPaths } =
    workspace.workspaceSliceKey.getSliceStateAsserted(store.state);

  const correctStorageProvider = isGithubStorageProvider()(store.state);

  return wsName ? (
    !correctStorageProvider ? (
      <div className="pl-3">"{wsName}" is not a Github workspace</div>
    ) : (
      <ModifiedEntries wsName={wsName} openedWsPaths={openedWsPaths} />
    )
  ) : (
    <div className="pl-3">Please open a Github workspace</div>
  );
}

function ModifiedEntries({
  wsName,
  openedWsPaths,
}: {
  wsName: string;
  openedWsPaths: wsPathHelpers.OpenedWsPaths;
}) {
  const store = useBangleStoreContext();
  const [modifiedEntries, updateModifiedEntries] = useState<
    undefined | LocalFileEntry[]
  >(undefined);

  const [refreshEntries, updateRefreshEntries] = useState(0);

  const { dispatchSerialOperation } = useSerialOperationContext();

  useEffect(() => {
    let destroyed = false;
    localFileEntryManager.getAllEntries(wsName + ':').then((r) => {
      if (!destroyed) {
        const result = r.filter((e) => !e.isUntouched);
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
  }, [refreshEntries, wsName, store]);

  useEffect(() => {
    log('modifiedEntries', modifiedEntries);
  }, [modifiedEntries]);

  // check if there changes in entries every X interval
  useInterval(
    () => {
      updateRefreshEntries((prev) => prev + 1);
    },
    [],
    REFRESH_INTERVAL,
  );

  return !modifiedEntries || modifiedEntries.length === 0 ? (
    <div className="px-3">Nothing to sync</div>
  ) : (
    <div>
      <div className="px-4 my-4">
        <ActionButton
          onPress={() => {
            dispatchSerialOperation({ name: OPERATION_SYNC_GITHUB_CHANGES });
          }}
          ariaLabel="Press sync to push any local changes and pull any new remote changes"
          tooltip={
            <TooltipWrapper>
              Press this button to push any local changes <br /> and pull any
              new remote changes
            </TooltipWrapper>
          }
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
              if (wsPathHelpers.isValidNoteWsPath(r.uid) && !r.deleted) {
                workspace.pushWsPath(r.uid)(store.state, store.dispatch);
              }
            }}
            item={{
              uid: r.uid,
              isDisabled:
                !wsPathHelpers.isValidNoteWsPath(r.uid) || r.deleted
                  ? true
                  : false,
              showDividerAbove: false,
              title: `${r.deleted ? '(deleted)' : ''}  ${
                wsPathHelpers.resolvePath(r.uid).filePath
              }`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

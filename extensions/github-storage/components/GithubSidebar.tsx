import React, { useEffect, useState } from 'react';

import {
  notification,
  useBangleStoreContext,
  useSerialOperationContext,
  useSliceState,
  workspace,
  wsPathHelpers,
} from '@bangle.io/api';
import { Severity } from '@bangle.io/constants';
import type { LocalFileEntry } from '@bangle.io/remote-file-sync';
import {
  ActionButton,
  ButtonContent,
  TooltipWrapper,
} from '@bangle.io/ui-bangle-button';
import { Sidebar } from '@bangle.io/ui-components';
import { shallowCompareArray, useInterval } from '@bangle.io/utils';

import { ghSliceKey, OPERATION_SYNC_GITHUB_CHANGES } from '../common';
import { localFileEntryManager } from '../file-entry-manager';

const LOG = false;

const log = LOG ? console.info.bind(console, 'GithubSidebar') : () => {};

const REFRESH_INTERVAL = 3000;

export function GithubSidebar() {
  const store = useBangleStoreContext();
  const { openedWsPaths } = workspace.workspaceSliceKey.getSliceStateAsserted(
    store.state,
  );

  const {
    sliceState: { githubWsName },
  } = useSliceState(ghSliceKey);

  return githubWsName ? (
    <ModifiedEntries wsName={githubWsName} openedWsPaths={openedWsPaths} />
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

  const {
    sliceState: { conflictedWsPaths },
  } = useSliceState(ghSliceKey);
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
    <div className="px-3 text-lg">Everything is synced 🧘‍♂️!</div>
  ) : (
    <div>
      <div className="px-4 my-4">
        <ActionButton
          onPress={() => {
            notification.showNotification({
              title: 'Starting sync',
              severity: Severity.INFO,
              uid: 'starting-sync' + Date.now(),
              transient: true,
            })(store.state, store.dispatch);

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
              title: `${r.deleted ? '(deleted) ' : ''}${
                conflictedWsPaths.includes(r.uid) ? '(conflict) ' : ''
              }${wsPathHelpers.resolvePath(r.uid).filePath}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

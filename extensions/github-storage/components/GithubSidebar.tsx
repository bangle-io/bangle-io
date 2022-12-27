import React, { useEffect, useState } from 'react';

import {
  notification,
  useBangleStoreContext,
  useSerialOperationContext,
  useSliceState,
  workspace,
  wsPathHelpers,
} from '@bangle.io/api';
import { SEVERITY } from '@bangle.io/constants';
import type { PlainObjEntry } from '@bangle.io/remote-file-sync';
import { isEntryUntouched } from '@bangle.io/remote-file-sync';
import { ButtonV2, Sidebar } from '@bangle.io/ui-components';
import { shallowCompareArray, useInterval } from '@bangle.io/utils';

import { ghSliceKey, OPERATION_SYNC_GITHUB_CHANGES } from '../common';
import { fileEntryManager } from '../file-entry-manager';

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
    undefined | PlainObjEntry[]
  >(undefined);

  const [refreshEntries, updateRefreshEntries] = useState(0);

  const {
    sliceState: { conflictedWsPaths },
  } = useSliceState(ghSliceKey);
  const { dispatchSerialOperation } = useSerialOperationContext();

  useEffect(() => {
    let destroyed = false;
    fileEntryManager.listAllEntries(wsName).then((entries) => {
      if (!destroyed) {
        const result = entries.filter((e) => {
          return !isEntryUntouched(e);
        });
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
        <ButtonV2
          className="w-full"
          onPress={() => {
            notification.showNotification({
              title: 'Starting sync',
              severity: SEVERITY.INFO,
              uid: 'starting-sync' + Date.now(),
              transient: true,
            })(store.state, store.dispatch);

            dispatchSerialOperation({ name: OPERATION_SYNC_GITHUB_CHANGES });
          }}
          ariaLabel="Press sync to push any local changes and pull any new remote changes"
          tooltipPlacement="bottom"
          text="Sync"
        />
      </div>
      <div className="px-3 text-sm">Files that need to be synced</div>
      <div className="">
        {modifiedEntries.map((r) => (
          <Sidebar.Row2
            key={r.uid}
            isActive={openedWsPaths.primaryWsPath === r.uid}
            className="rounded text-sm truncate py-1 select-none pl-3"
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

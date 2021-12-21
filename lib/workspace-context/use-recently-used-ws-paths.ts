import { useCallback, useEffect, useMemo } from 'react';

import { usePrevious, useRecencyMonitor } from '@bangle.io/utils';
import { Location } from '@bangle.io/ws-path';

import { MAX_ENTRIES, MAX_TIMESTAMPS_PER_ENTRY } from './config';
import { Selectors, WorkspaceDispatch, WorkspaceStore } from './WorkspaceStore';

export function useRecentlyUsedWsPaths() {
  const { wsName, openedWsPaths: openedPaths } = useMemo(
    () => ({
      wsName: Selectors.wsName(location),
      openedWsPaths: Selectors.openedWsPaths(location),
    }),
    [location],
  );

  const prevOpenedPaths = usePrevious(openedPaths);
  const { records, updateRecord: _updateRecord } = useRecencyMonitor({
    // wsName can be undefined but it should be okay as we prevent
    // updating record when it is undefined
    uid: 'WorkspaceContextProvider/useRecentlyUsedWsPaths/1/' + (wsName || ''),
    maxEntries: MAX_ENTRIES,
    maxTimestampsPerEntry: MAX_TIMESTAMPS_PER_ENTRY,
  });

  const updateRecord = useCallback(
    (wsPath: string | null | undefined): void => {
      if (wsPath) {
        _updateRecord(wsPath);
      }
    },
    [_updateRecord],
  );

  useEffect(() => {
    if (!wsName) {
      return;
    }

    if (prevOpenedPaths && !openedPaths.equal(prevOpenedPaths)) {
      openedPaths.forEachWsPath((wsPath) => {
        // only update if not previously opened
        if (!prevOpenedPaths.has(wsPath)) {
          updateRecord(wsPath);
        }
      });
    }

    if (!prevOpenedPaths) {
      openedPaths.forEachWsPath((wsPath) => {
        updateRecord(wsPath);
      });
    }
  }, [wsName, openedPaths, updateRecord, prevOpenedPaths]);

  useEffect(() => {
    storeDispatch({
      type: '@UPDATE_RECENTLY_USED_WS_PATHS',
      value: records
        .map((r) => r.key)
        .filter((r) => Selectors.noteWsPaths(workspaceStore)?.includes(r)),
    });
  }, [storeDispatch, workspaceStore, records]);
}

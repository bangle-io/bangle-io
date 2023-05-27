import { useCallback, useEffect } from 'react';

import { isMobile, usePrevious, useRecencyMonitor } from '@bangle.io/utils';

import { useWorkspaceContext } from './WorkspaceContext';

export const MAX_ENTRIES = isMobile ? 12 : 64;
export const MAX_TIMESTAMPS_PER_ENTRY = 5;

export function useRecentlyUsedWsPaths() {
  const { openedWsPaths, wsName, noteWsPaths, bangleStore } =
    useWorkspaceContext();

  const prevOpenedPaths = usePrevious(openedWsPaths);
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

    if (prevOpenedPaths && !openedWsPaths.equal(prevOpenedPaths)) {
      openedWsPaths.forEachWsPath((wsPath) => {
        // only update if not previously opened
        if (!prevOpenedPaths.has(wsPath)) {
          updateRecord(wsPath);
        }
      });
    }

    if (!prevOpenedPaths) {
      openedWsPaths.forEachWsPath((wsPath) => {
        updateRecord(wsPath);
      });
    }
  }, [wsName, openedWsPaths, updateRecord, prevOpenedPaths]);

  useEffect(() => {
    if (wsName && Array.isArray(noteWsPaths)) {
      bangleStore.dispatch({
        name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
        value: {
          wsName,
          recentlyUsedWsPaths: records
            .map((r) => r.key)
            .filter((r) => noteWsPaths.includes(r)),
        },
      });
    }
  }, [noteWsPaths, bangleStore, wsName, records]);
}

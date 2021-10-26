import { useCallback, useEffect, useMemo } from 'react';

import { usePrevious, useRecencyMonitor } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

const MAX_ENTRIES = 64;
const MAX_TIMESTAMPS_PER_ENTRY = 5;

export function useRecentlyUsedWsPaths(
  wsName: string | undefined,
  openedPaths: OpenedWsPaths,
  noteWsPaths: string[] | undefined,
) {
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
  }, [wsName, openedPaths, noteWsPaths, updateRecord, prevOpenedPaths]);

  return useMemo(() => {
    return records.map((r) => r.key).filter((r) => noteWsPaths?.includes(r));
  }, [records, noteWsPaths]);
}

import { useCallback, useEffect, useMemo } from 'react';

import { useSliceState } from '@bangle.io/app-state-context';
import { usePrevious, useRecencyMonitor } from '@bangle.io/utils';

import { workspaceSliceKey } from './common';
import { MAX_ENTRIES, MAX_TIMESTAMPS_PER_ENTRY } from './config';
import { workspaceSliceInitialState } from './workspace-slice';

export function useRecentlyUsedWsPaths() {
  const { sliceState, store: bangleStore } = useSliceState(
    workspaceSliceKey,
    workspaceSliceInitialState,
  );

  if (!sliceState) {
    throw new Error('Slice state cannot be undefined');
  }

  const { openedWsPaths, wsName } = sliceState;

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
    const data = workspaceSliceKey.getSliceState(bangleStore.state);
    const noteWsPaths = data?.noteWsPaths;

    if (wsName && Array.isArray(noteWsPaths)) {
      bangleStore.dispatch({
        name: 'action::workspace-context:update-recently-used-ws-paths',
        value: {
          wsName,
          recentlyUsedWsPaths: records
            .map((r) => r.key)
            .filter((r) => noteWsPaths.includes(r)),
        },
      });
    }
  }, [bangleStore, wsName, records]);
}

import { useMemo } from 'react';
import type { Merge } from 'type-fest';

import { useSliceState } from '@bangle.io/bangle-store-context';
import type { ApplicationStore } from '@bangle.io/create-store';

import { workspaceSliceKey } from './common';
import type { WorkspaceSliceState } from './workspace-slice-state';

export type WorkspaceContextType = Merge<
  WorkspaceSliceState,
  {
    bangleStore: ApplicationStore;
  }
>;

export function useWorkspaceContext() {
  const { sliceState, store } = useSliceState(workspaceSliceKey);

  return useMemo(
    () => ({
      noteWsPaths: sliceState.noteWsPaths,
      openedWsPaths: sliceState.openedWsPaths,
      recentlyUsedWsPaths: sliceState.recentlyUsedWsPaths,
      wsName: sliceState.wsName,
      wsPaths: sliceState.wsPaths,
      refreshCounter: sliceState.refreshCounter,
      bangleStore: store,
      cachedWorkspaceInfo: sliceState.cachedWorkspaceInfo,
    }),
    [sliceState, store],
  );
}

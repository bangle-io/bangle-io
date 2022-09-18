import React, { useContext, useMemo } from 'react';
import type { Merge } from 'type-fest';

import {
  initialBangleStore,
  useSliceState,
} from '@bangle.io/bangle-store-context';
import type { ApplicationStore } from '@bangle.io/create-store';

import { workspaceSliceKey } from './common';
import { useRecentlyUsedWsPaths } from './use-recently-used-ws-paths';
import { workspaceSliceInitialState } from './workspace-slice';
import type { WorkspaceSliceState } from './workspace-slice-state';

export type WorkspaceContextType = Merge<
  WorkspaceSliceState,
  {
    bangleStore: ApplicationStore;
  }
>;

const WorkspaceHooksContext = React.createContext<WorkspaceContextType>({
  noteWsPaths: workspaceSliceInitialState.noteWsPaths,
  openedWsPaths: workspaceSliceInitialState.openedWsPaths,
  recentlyUsedWsPaths: workspaceSliceInitialState.recentlyUsedWsPaths,
  wsName: workspaceSliceInitialState.wsName,
  wsPaths: workspaceSliceInitialState.wsPaths,
  bangleStore: initialBangleStore,
  refreshCounter: workspaceSliceInitialState.refreshCounter,
  cachedWorkspaceInfo: workspaceSliceInitialState.cachedWorkspaceInfo,
});

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

// TODO: remove these slice providers as they are just pulling state from the outer context.
export function WorkspaceContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sliceState, store } = useSliceState(workspaceSliceKey);

  if (!sliceState) {
    throw new Error('Slice state cannot be undefined');
  }

  useRecentlyUsedWsPaths();

  const value: WorkspaceContextType = useMemo(() => {
    return {
      noteWsPaths: sliceState.noteWsPaths,
      openedWsPaths: sliceState.openedWsPaths,
      recentlyUsedWsPaths: sliceState.recentlyUsedWsPaths,
      wsName: sliceState.wsName,
      wsPaths: sliceState.wsPaths,
      refreshCounter: sliceState.refreshCounter,
      bangleStore: store,
      cachedWorkspaceInfo: sliceState.cachedWorkspaceInfo,
    };
  }, [sliceState, store]);

  return (
    <WorkspaceHooksContext.Provider value={value}>
      {children}
    </WorkspaceHooksContext.Provider>
  );
}

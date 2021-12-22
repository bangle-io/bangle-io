import React, { useContext, useMemo } from 'react';
import type { Merge } from 'type-fest';

import {
  initialBangleStore,
  useSliceState,
} from '@bangle.io/app-state-context';
import { ApplicationStore } from '@bangle.io/create-store';

import { workspaceSliceKey } from './common';
import type { WorkspaceSliceState } from './slice-state';
import { workspaceSliceInitialState } from './workspace-slice';

export type WorkspaceContextType = Merge<
  WorkspaceSliceState,
  {
    bangleStore: ApplicationStore;
  }
>;

const WorkspaceHooksContext = React.createContext<WorkspaceContextType>({
  ...workspaceSliceInitialState,
  bangleStore: initialBangleStore,
});

export function useWorkspaceContext() {
  return useContext(WorkspaceHooksContext);
}

export function WorkspaceContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sliceState, store } = useSliceState(
    workspaceSliceKey,
    workspaceSliceInitialState,
  );

  if (!sliceState) {
    throw new Error('Slice state cannot be undefined');
  }

  const value: WorkspaceContextType = useMemo(() => {
    return {
      ...sliceState,
      bangleStore: store,
    };
  }, [sliceState, store]);

  return (
    <WorkspaceHooksContext.Provider value={value}>
      {children}
    </WorkspaceHooksContext.Provider>
  );
}

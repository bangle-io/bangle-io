import React, { useContext, useEffect, useState } from 'react';

import {
  ApplicationStore,
  AppState as ApplicationState,
  SliceKey,
} from '@bangle.io/create-store';

export interface AppState {
  hasPendingWrites?: boolean;
  pageLifecycleState?: string;
  prevPageLifecycleState?: string;
}
export const AppStateContext = React.createContext<{
  mutableAppStateValue?: AppState;
  appStateValue?: Readonly<AppState>;
  appState?: unknown;

  // store
  storeChanged: number;
  store: ApplicationStore;
}>({
  storeChanged: 0,
  store: new ApplicationStore(ApplicationState.create({ slices: [] })),
});

export function useBangleStoreContext() {
  return useContext(AppStateContext);
}

export function useSliceState<SL, A, S = SL>(
  sliceKey: SliceKey<SL, A, S>,
  initialState: SL,
) {
  const [sliceState, updateSliceState] = useState<SL>(initialState);
  const { store, storeChanged } = useBangleStoreContext();

  useEffect(() => {
    const newState = sliceKey.getSliceState(store.state);
    if (newState && sliceState !== newState) {
      updateSliceState(newState);
    }
  }, [storeChanged, sliceKey, sliceState, store]);

  return { sliceState, store: store as ApplicationStore<S, A> };
}

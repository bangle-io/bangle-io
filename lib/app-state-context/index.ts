import React, { useContext, useEffect, useState } from 'react';

import {
  ApplicationStore,
  AppState as ApplicationState,
  SliceKey,
} from '@bangle.io/create-store';

export const AppStateContext = React.createContext<{
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
  initialState?: SL,
) {
  const [sliceState, updateSliceState] = useState<SL | undefined>(initialState);
  const { store, storeChanged } = useBangleStoreContext();

  useEffect(() => {
    const newState = sliceKey.getSliceState(store.state);
    if (newState && sliceState !== newState) {
      updateSliceState(newState);
    }
  }, [storeChanged, sliceKey, sliceState, store]);

  return { sliceState, store: store as ApplicationStore<S, A> };
}

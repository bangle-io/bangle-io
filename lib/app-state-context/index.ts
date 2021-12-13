import React, { useContext, useEffect, useState } from 'react';

import { MAIN_STORE_NAME } from '@bangle.io/constants';
import {
  ApplicationStore,
  AppState as ApplicationState,
  BaseAction,
  SliceKey,
} from '@bangle.io/create-store';

const initStore = ApplicationStore.create({
  storeName: MAIN_STORE_NAME,
  state: ApplicationState.create({ slices: [] }),
});

export const BangleStoreContext =
  React.createContext<ApplicationStore>(initStore);

export const AppStateContext = React.createContext<{
  // store
  storeChanged: number;
  store: ApplicationStore;
}>({
  storeChanged: 0,
  store: initStore,
});

export function useBangleStoreContext() {
  return useContext(BangleStoreContext);
}

export function useSliceState<SL, A extends BaseAction, S = SL>(
  sliceKey: SliceKey<SL, A, S>,
  initialState?: SL,
) {
  const [sliceState, updateSliceState] = useState<SL | undefined>(initialState);
  const store = useBangleStoreContext();
  const { storeChanged } = useContext(AppStateContext);

  useEffect(() => {
    const newState = sliceKey.getSliceState(store.state);
    if (newState && sliceState !== newState) {
      updateSliceState(newState);
    }
  }, [storeChanged, sliceKey, sliceState, store]);

  return { sliceState, store: store as ApplicationStore<S, A> };
}

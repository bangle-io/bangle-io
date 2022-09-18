import React, { useContext, useEffect, useState } from 'react';

import { MAIN_STORE_NAME } from '@bangle.io/constants';
import type { BaseAction, SliceKey } from '@bangle.io/create-store';
import {
  ApplicationStore,
  AppState as ApplicationState,
} from '@bangle.io/create-store';

export const initialBangleStore = ApplicationStore.create({
  storeName: MAIN_STORE_NAME,
  state: ApplicationState.create<any, any>({ slices: [] }),
});

export const BangleStore2Context = React.createContext<{
  current: ApplicationStore;
}>({
  // Note: this is just a dummy value to satisfy typescript and some tests,
  // it is guaranteed to be replaced by the real value in the provider.
  current: ApplicationStore.create({
    storeName: MAIN_STORE_NAME,
    state: ApplicationState.create({ slices: [] }),
  }),
});

export function useBangleStore2Context() {
  return useContext(BangleStore2Context)?.current!;
}

export const BangleStoreChanged = React.createContext<number>(-1);

export function useBangleStoreContext() {
  return useContext(BangleStore2Context).current;
}

export function useBangleStoreDispatch<
  T extends BaseAction,
>(): ApplicationStore<any, T>['dispatch'] {
  return useContext(BangleStore2Context).current.dispatch;
}

export function useSliceState<SL, A extends BaseAction, S = SL>(
  sliceKey: SliceKey<SL, A, S>,
) {
  const store: ApplicationStore<S, A> = useBangleStoreContext();
  const [sliceState, updateSliceState] = useState<SL>(() => {
    return sliceKey.getSliceStateAsserted(store.state);
  });
  const storeChanged = useContext(BangleStoreChanged);

  useEffect(() => {
    const newState = sliceKey.getSliceState(store.state);

    if (newState && sliceState !== newState) {
      updateSliceState(newState);
    }
  }, [storeChanged, sliceKey, sliceState, store]);

  return {
    sliceState,
    store: store,
    dispatch: store.dispatch,
  };
}

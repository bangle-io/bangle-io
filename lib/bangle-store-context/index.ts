import React, { useContext, useEffect, useState } from 'react';

import { MAIN_STORE_NAME } from '@bangle.io/constants';
import {
  ApplicationStore,
  AppState as ApplicationState,
  BaseAction,
  SliceKey,
} from '@bangle.io/create-store';

export const initialBangleStore = ApplicationStore.create({
  storeName: MAIN_STORE_NAME,
  state: ApplicationState.create({ slices: [] }),
});

export const BangleStoreContext =
  React.createContext<ApplicationStore>(initialBangleStore);

export const BangleStoreChanged = React.createContext<number>(-1);

export function useBangleStoreContext() {
  return useContext(BangleStoreContext);
}

export function useBangleStoreDispatch<
  T extends BaseAction,
>(): ApplicationStore<any, T>['dispatch'] {
  return useContext(BangleStoreContext).dispatch;
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

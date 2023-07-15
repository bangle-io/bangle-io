import React, { useContext, useEffect, useState } from 'react';

import { MAIN_STORE_NAME } from '@bangle.io/constants';
import type { BaseAction, SliceKey } from '@bangle.io/create-store';
import {
  ApplicationStore,
  AppState as ApplicationState,
} from '@bangle.io/create-store';
import type { AnySlice, Slice, Store } from '@bangle.io/nsm-3';
import { createUseSliceHook, store } from '@bangle.io/nsm-3';
import type { NsmStore } from '@bangle.io/shared-types';

export const initialNsmStore: NsmStore = store({
  storeName: 'nsm-store-main',
  slices: [] as any,
});

export const NsmStoreContext = React.createContext<typeof initialNsmStore>(
  // Note: this is just a dummy value to satisfy typescript and some tests,
  // it is guaranteed to be replaced by the real value in the provider.
  initialNsmStore,
);

export function useNsmSliceState<TSlice extends AnySlice>(
  slice: TSlice,
): ReturnType<TSlice['get']> {
  const appStore: Store = useContext(NsmStoreContext);

  // TODO move this to a more performance friendly approach which
  // directly gets the state
  return createUseSliceHook(appStore)(slice as AnySlice, (s) => s)[0];
}

export function useNsmSliceDispatch<TSlice extends AnySlice>(
  slice: TSlice,
): Store<TSlice extends Slice<infer N, any, any> ? N : never>['dispatch'] {
  const appStore: Store<string> = useContext(NsmStoreContext);

  // TODO move this to a more performance friendly approach which
  // directly gets the state
  return appStore.dispatch;
}

export function useNsmSlice<TSlice extends AnySlice>(
  slice: TSlice,
): [
  ReturnType<TSlice['get']>,
  Store<TSlice extends Slice<infer N, any, any> ? N : never>['dispatch'],
] {
  const appStore: Store<string> = useContext(NsmStoreContext);

  return createUseSliceHook(appStore)(slice as AnySlice, (s) => s);
}

export function useNsmStore<TSliceName extends string>(
  slices: Array<Slice<TSliceName, any, any>>,
): Store<TSliceName> {
  return useContext(NsmStoreContext);
}

export function useNsmPlainStore(): NsmStore {
  return useContext(NsmStoreContext);
}

export const initialBangleStore = ApplicationStore.create({
  storeName: MAIN_STORE_NAME,
  state: ApplicationState.create<any, any>({ slices: [] }),
});

export const BangleStoreContext = React.createContext<{
  current: ApplicationStore;
}>({
  // Note: this is just a dummy value to satisfy typescript and some tests,
  // it is guaranteed to be replaced by the real value in the provider.
  current: ApplicationStore.create({
    storeName: MAIN_STORE_NAME,
    state: ApplicationState.create({ slices: [] }),
  }),
});

export const BangleStoreChanged = React.createContext<number>(-1);

export function useBangleStoreContext() {
  return useContext(BangleStoreContext).current;
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

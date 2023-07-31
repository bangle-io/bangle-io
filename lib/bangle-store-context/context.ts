import React, { useContext } from 'react';

import type { AnySlice, Slice, Store } from '@bangle.io/nsm-3';
import { createUseTrackSliceHook, store } from '@bangle.io/nsm-3';
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

export function useNsmStoreContext() {}

export function useNsmSliceState<TSlice extends AnySlice>(
  slice: TSlice,
): ReturnType<TSlice['get']> {
  const appStore: Store = useContext(NsmStoreContext);

  // TODO move this to a more performance friendly approach which
  // directly gets the state
  return createUseTrackSliceHook(appStore)(slice as AnySlice);
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

  return [
    createUseTrackSliceHook(appStore)(slice as AnySlice),
    appStore.dispatch,
  ];
}

export function useNsmStore<TSliceName extends string>(
  slices: Array<Slice<TSliceName, any, any>>,
): Store<TSliceName> {
  return useContext(NsmStoreContext);
}

export function useNsmPlainStore(): NsmStore {
  return useContext(NsmStoreContext);
}

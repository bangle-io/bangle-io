import type {
  AnySlice,
  AnySliceWithName,
  InferSliceName,
  StoreState,
  ValidStoreState,
} from 'nalanda';

export {
  customSerialAction,
  payloadParser,
  payloadSerializer,
  serialAction,
  validateSlicesForSerialization,
} from './action-serialization';
export type {
  InferSliceState,
  SliceStateSerialData,
} from './slice-state-serialization';
export { sliceStateSerializer } from './slice-state-serialization';
export type {
  AnySlice,
  AnySliceWithName,
  InferSliceName,
  LineageId,
  MainStoreInfo,
  SyncMessage,
  ValidStoreState,
} from 'nalanda';
export {
  changeEffect,
  createBaseSlice,
  createDispatchSpy,
  createSelector,
  createSlice,
  createSliceV2,
  createSliceWithSelectors,
  createSyncStore,
  createUseSliceHook,
  idleCallbackScheduler,
  intervalRunEffect,
  mergeAll,
  mountEffect,
  Slice,
  Store,
  StoreState,
  syncChangeEffect,
  timeoutSchedular,
  Transaction,
} from 'nalanda';
export * as superJson from 'superjson';
export { z } from 'zod';

export function updateState<T extends object>(
  initState: T,
  override: (newState: T, oldState: T) => T = (newState) => newState,
) {
  return (
    oldState: T,
    callback: Partial<T> | ((obj: T) => Partial<T>) = {},
  ) => {
    const val = typeof callback === 'function' ? callback(oldState) : callback;
    const newState = { ...oldState, ...val };

    return override(newState, oldState);
  };
}

export function subSelectorBuilder<
  N extends string,
  TState,
  TDepSlice extends AnySlice,
>(deps: TDepSlice[], name: N, initState: TState) {
  return <T>(
    cb: (state: TState, storeState: StoreState<InferSliceName<TDepSlice>>) => T,
  ) => {
    return cb;
  };
}

export function createOp<
  N extends string,
  TCallback extends (storeState: StoreState<N>, ...args: any[]) => any,
>(slice: AnySliceWithName<N>, cb: TCallback) {
  return <TStateSlices extends string>(
    storeState: ValidStoreState<TStateSlices, N>,
    ...args: InferRemainingParams<TCallback>
  ): ReturnType<TCallback> => {
    return cb(storeState as StoreState<any>, ...args);
    // cb(storeState as StoreState<N>, ...slice.deps.map((dep) => dep.name));
  };
}

type InferRemainingParams<TCallback extends (x: any, ...args: any) => any> =
  TCallback extends (x: any, ...args: infer TRem) => any ? TRem : never;

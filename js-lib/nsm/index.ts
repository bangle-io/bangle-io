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

export function updateObj<T extends object>(
  obj: T,
  callback: Partial<T> | ((obj: T) => Partial<T>) = {},
): T {
  const val = typeof callback === 'function' ? callback(obj) : callback;

  return { ...obj, ...val };
}

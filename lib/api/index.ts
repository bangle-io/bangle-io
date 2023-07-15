import type { ApplicationStore } from '@bangle.io/create-store';
import type {
  AnySlice,
  InferSliceNameFromSlice,
  Store,
} from '@bangle.io/nsm-3';
import type { BangleApplicationStore, NsmStore } from '@bangle.io/shared-types';

export * as nsmApi2 from './nsm/index';
export * as internalApi from './nsm/internal';
export * as page from './page';
export {
  useSerialOperationContext,
  useSerialOperationHandler,
} from './serial-operation-context';
export * as workspace from './workspace';
export {
  useBangleStoreContext,
  useNsmPlainStore,
  useNsmSlice,
  useNsmSliceState,
  useNsmStore,
  useSliceState,
} from '@bangle.io/bangle-store-context';
export { Slice, SliceKey } from '@bangle.io/create-store';
export { vars } from '@bangle.io/css-vars';
export { Extension } from '@bangle.io/extension-registry';
export * as nsm from '@bangle.io/nsm-3';
export { browserInfo } from '@bangle.io/utils';
export * as wsPathHelpers from '@bangle.io/ws-path';
export type { BangleApplicationStore };
export type BangleAppDispatch = BangleApplicationStore['dispatch'];
export type BangleAppState = BangleApplicationStore['state'];

export { _internal_setStore } from './internals';

export function getOldStore(nsmStore: NsmStore): ApplicationStore {
  let val: ApplicationStore = (nsmStore as any).oldStore;

  if (!val) {
    throw new Error('Old store not found');
  }

  return val;
}

export function getNewStore(oldStore: ApplicationStore): NsmStore {
  let val: NsmStore = (oldStore as any).newStore;

  if (!val) {
    throw new Error('New store not found');
  }

  return val;
}

export function getExtensionStore<TSlice extends AnySlice>(
  slice: TSlice,
): Store<InferSliceNameFromSlice<TSlice>> {
  return (window as any).globalNsmStore;
}

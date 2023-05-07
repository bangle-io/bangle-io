import type { ApplicationStore } from '@bangle.io/create-store';
import type { AnySlice, InferSliceName, Store } from '@bangle.io/nsm';
import type { BangleApplicationStore, NsmStore } from '@bangle.io/shared-types';

export * as editor from './editor';
export * as notification from './notification';
export * as nsmApi2 from './nsm/index';
export * as page from './page';
export * as search from './search';
export {
  useSerialOperationContext,
  useSerialOperationHandler,
} from './serial-operation-context';
export * as ui from './ui';
export * as workspace from './workspace';
export * as wsPathHelpers from './ws-path-helpers';
export {
  useBangleStoreContext,
  useNsmDispatch,
  useNsmPlainStore,
  useNsmSlice,
  useNsmSliceState,
  useNsmState,
  useNsmStore,
  useSliceState,
} from '@bangle.io/bangle-store-context';
export { Slice, SliceKey } from '@bangle.io/create-store';
export { vars } from '@bangle.io/css-vars';
export { Extension } from '@bangle.io/extension-registry';
export {
  type AnySlice,
  changeEffect,
  createSliceV2,
  Slice as NsmSlice,
} from '@bangle.io/nsm';
export { browserInfo } from '@bangle.io/utils';
export { resolvePath } from '@bangle.io/ws-path';
export type { BangleApplicationStore };
export type BangleAppDispatch = BangleApplicationStore['dispatch'];
export type BangleAppState = BangleApplicationStore['state'];

export * as internals from './internals';

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
): Store<InferSliceName<TSlice>> {
  return (window as any).globalNsmStore;
}

import type {
  AnySlice,
  InferSliceNameFromSlice,
  Store,
} from '@bangle.io/nsm-3';
import type { BangleApplicationStore, NsmStore } from '@bangle.io/shared-types';

export * as nsmApi2 from './nsm/index';
export * as internalApi from './nsm/internal';
export { SerialOperationContextProvider as _SerialOperationContextProvider } from './serial-operation-context';
export {
  useSerialOperationContext,
  useSerialOperationHandler,
} from './serial-operation-context';
export {
  useBangleStoreContext,
  useNsmPlainStore,
  useNsmSlice,
  useNsmSliceDispatch,
  useNsmSliceState,
  useNsmStore,
} from '@bangle.io/bangle-store-context';
export { vars } from '@bangle.io/css-vars';
export { Extension } from '@bangle.io/extension-registry';
export * as nsm from '@bangle.io/nsm-3';
export { browserInfo } from '@bangle.io/utils';
export * as wsPathHelpers from '@bangle.io/ws-path';
export type { BangleApplicationStore };
export type BangleAppDispatch = BangleApplicationStore['dispatch'];
export type BangleAppState = BangleApplicationStore['state'];

export { _internal_setStore } from './internals';

export function getExtensionStore<TSlice extends AnySlice>(
  slice: TSlice,
): Store<InferSliceNameFromSlice<TSlice>> {
  return (window as any).globalNsmStore;
}

import type {
  AnySlice,
  InferSliceNameFromSlice,
  Store,
} from '@bangle.io/nsm-3';

import { _internal_getStore } from './nsm/internal';

export * as nsmApi2 from './nsm/index';
export * as internalApi from './nsm/internal';
export { SerialOperationContextProvider as _SerialOperationContextProvider } from './serial-operation-context';
export {
  useSerialOperationContext,
  useSerialOperationHandler,
} from './serial-operation-context';
export {
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

export function getExtensionStore<TSlice extends AnySlice>(
  slice: TSlice,
): Store<InferSliceNameFromSlice<TSlice>> {
  return _internal_getStore() as Store;
}

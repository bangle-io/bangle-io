import type { BangleApplicationStore } from '@bangle.io/shared-types';

export * as editor from './editor';
export * as notification from './notification';
export * as search from './search';
export {
  SerialOperationContextProvider,
  useSerialOperationContext,
  useSerialOperationHandler,
} from './serial-operation';
export * as workspace from './workspace';
export * as wsPathHelpers from './ws-path-helpers';
export { useBangleStoreContext } from '@bangle.io/bangle-store-context';
export { Slice, SliceKey } from '@bangle.io/create-store';
export { Extension } from '@bangle.io/extension-registry';

export type { BangleApplicationStore };
export type BangleAppState = BangleApplicationStore['state'];
export type BangleAppDispatch = BangleApplicationStore['dispatch'];

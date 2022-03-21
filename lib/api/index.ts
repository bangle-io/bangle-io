import type { BangleApplicationStore } from '@bangle.io/shared-types';

export * as editor from './editor';
export * as notification from './notification';
export * as search from './search';
export * as workspace from './workspace';
export * as wsPathHelpers from './ws-path-helpers';
export { useBangleStoreContext } from '@bangle.io/bangle-store-context';
export { Slice, SliceKey } from '@bangle.io/create-store';
export { Extension } from '@bangle.io/extension-registry';
export {
  useSerialOperationContext,
  useSerialOperationHandler,
} from '@bangle.io/serial-operation-context';

export type { BangleApplicationStore };
export type BangleAppState = BangleApplicationStore['state'];
export type BangleAppDispatch = BangleApplicationStore['dispatch'];

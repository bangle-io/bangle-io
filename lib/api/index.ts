import type { ApplicationStore } from '@bangle.io/create-store';
import type { BangleApplicationStore, NsmStore } from '@bangle.io/shared-types';

export * as editor from './editor';
export * as notification from './notification';
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
  useNsmPlainStore,
  useNsmSlice,
  useNsmState,
  useNsmStore,
  useSliceState,
} from '@bangle.io/bangle-store-context';
export { Slice, SliceKey } from '@bangle.io/create-store';
export { Extension } from '@bangle.io/extension-registry';
export { browserInfo } from '@bangle.io/utils';
export type { BangleApplicationStore };
export type BangleAppState = BangleApplicationStore['state'];
export type BangleAppDispatch = BangleApplicationStore['dispatch'];
export { vars } from '@bangle.io/css-vars';

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

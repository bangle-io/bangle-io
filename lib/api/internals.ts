import type { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import type { InferSliceName, Store, Transaction } from '@bangle.io/nsm';
import type { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import type { nsmNotification } from '@bangle.io/slice-notification';
import type { nsmPageSlice } from '@bangle.io/slice-page';
import type { sliceRefreshWorkspace } from '@bangle.io/slice-refresh-workspace';
import type { nsmUISlice } from '@bangle.io/slice-ui';

import type { _editorManagerProxy } from './nsm/editor';

let _store: ApiStore;

export function setStore(store: ApiStore) {
  _store = store;
}

export function getStore(): ApiStore {
  if (!_store) {
    throw new Error('Store not set');
  }

  return _store;
}

export function dispatchWrapper<
  TCallback extends (...args: any[]) => Transaction<any, any>,
>(fn: TCallback): (...args: Parameters<TCallback>) => void {
  return (...args: Parameters<TCallback>) => {
    getStore().dispatch(fn(...args));
  };
}

export type ApiSliceNames =
  | InferSliceName<typeof nsmUISlice>
  | InferSliceName<typeof nsmEditorManagerSlice>
  | InferSliceName<typeof nsmPageSlice>
  | InferSliceName<typeof nsmSliceWorkspace>
  | InferSliceName<typeof _editorManagerProxy>
  | InferSliceName<typeof nsmExtensionRegistry>
  | InferSliceName<typeof nsmNotification.nsmNotificationSlice>
  | InferSliceName<typeof sliceRefreshWorkspace>;

export type ApiStore = Store<ApiSliceNames>;
export type ApiStoreState = ApiStore['state'];

export type ApiStoreDispatch = ApiStore['dispatch'];

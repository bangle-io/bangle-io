import type { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import type {
  Dispatch,
  InferSliceNameFromSlice,
  Store,
} from '@bangle.io/nsm-3';
import type { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import type { nsmNotificationSlice } from '@bangle.io/slice-notification';
import type { nsmPageSlice } from '@bangle.io/slice-page';
import type { sliceRefreshWorkspace } from '@bangle.io/slice-refresh-workspace';
import type { nsmUISlice } from '@bangle.io/slice-ui';

import type { editorManagerProxy } from './nsm/editor';

export type ApiSliceNames =
  | InferSliceNameFromSlice<typeof nsmUISlice>
  | InferSliceNameFromSlice<typeof nsmEditorManagerSlice>
  | InferSliceNameFromSlice<typeof nsmPageSlice>
  | InferSliceNameFromSlice<typeof nsmSliceWorkspace>
  | InferSliceNameFromSlice<typeof editorManagerProxy>
  | InferSliceNameFromSlice<typeof nsmExtensionRegistry>
  | InferSliceNameFromSlice<typeof nsmNotificationSlice>
  | InferSliceNameFromSlice<typeof sliceRefreshWorkspace>;

export type ApiStore = Store<ApiSliceNames>;
let _store: ApiStore;

export function _internal_setStore(store: ApiStore) {
  _store = store;
}

export function getStore(): ApiStore {
  if (!_store) {
    throw new Error('Store not set');
  }

  return _store;
}

export type ApiStoreState = ApiStore['state'];

// TODO need to make nalanda support generic dispatch
export type ApiStoreDispatch<TSliceName extends string> = Dispatch<TSliceName>;

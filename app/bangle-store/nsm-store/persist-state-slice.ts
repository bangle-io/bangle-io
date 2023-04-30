import { safeJSONParse, safeJSONStringify } from '@bangle.io/mini-js-utils';
import type { LineageId, SliceStateSerialData } from '@bangle.io/nsm';
import { createSliceV2, Slice } from '@bangle.io/nsm';
import * as editorManager from '@bangle.io/slice-editor-manager';
import { nsmPageSlice } from '@bangle.io/slice-page';

export const LOCAL_STORAGE_KEY = 'nsm-local-storage-v1';
export const SESSION_STORAGE_KEY = 'nsm-session-storage-v1';

export const getLocalStorageData = () =>
  retrieveData(LOCAL_STORAGE_KEY, localStorage, () => {
    //   Add slices here
    return {};
  });

export const getSessionStorageData = () =>
  retrieveData(SESSION_STORAGE_KEY, sessionStorage, (data) => {
    const result: Record<LineageId, unknown> = {};

    //   Add slices here
    result[editorManager.nsmEditorManagerSlice.spec.lineageId] =
      editorManager.persistState.retrieve(data);

    return result;
  });

export const persistStateSlice = createSliceV2(
  [nsmPageSlice, editorManager.nsmEditorManagerSlice],
  {
    name: 'persistStateSlice',
    initState: {},
  },
);

Slice._registerEffect(persistStateSlice, {
  name: 'persistStateWatch',
  init(slice, store, ref) {},
  updateSync(slice, store, prevState) {
    const newPageState = nsmPageSlice.getState(store.state).lifeCycleState;
    const oldPageState = nsmPageSlice.getState(prevState).lifeCycleState;

    if (newPageState === oldPageState) {
      return;
    }

    persistData(SESSION_STORAGE_KEY, sessionStorage, (data) => {
      //   Add slices here
      editorManager.persistState.populate(store.state, data);
    });

    persistData(LOCAL_STORAGE_KEY, localStorage, (data) => {
      //   Add slices here
    });
  },
});

export function persistData(
  key: string,
  storage: {
    setItem: (key: string, value: string) => void;
    getItem: (key: string) => string | null;
    removeItem: (key: string) => void;
  },
  handle: (data: SliceStateSerialData) => void,
): void {
  const data: SliceStateSerialData = {};

  handle(data);

  const result = safeJSONStringify(data);

  if (result.success) {
    storage.setItem(key, result.value);
  } else {
    console.warn(`Failed to persist data for key: ${key}`);
  }
}

export function retrieveData(
  key: string,
  storage: {
    setItem: (key: string, value: string) => void;
    getItem: (key: string) => string | null;
    removeItem: (key: string) => void;
  },
  handle: (data: SliceStateSerialData) => Record<LineageId, unknown>,
): Record<LineageId, unknown> {
  const rawData = storage.getItem(key);

  if (rawData == null) {
    return {};
  }
  const jsonParseResult = safeJSONParse(rawData);

  if (!jsonParseResult.success) {
    storage.removeItem(key);
    // TODO we need to handle this better
    console.warn(`Unable to parse data for key: ${key}`);

    return {};
  }

  return handle(jsonParseResult.value);
}

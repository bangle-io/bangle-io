import { useMemo } from 'react';

import type { EditorState, EditorView, Transaction } from '@bangle.dev/pm';

import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import {
  EXECUTE_SEARCH_OPERATION,
  PRIMARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type {
  DispatchSerialOperationType,
  WsPath,
} from '@bangle.io/shared-types';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';
import * as editorManager from '@bangle.io/slice-editor-manager';

import { _internal_getStore } from './internal/internals';

export { searchPluginKey } from '@bangle.io/editor-common';
export const editorState = () => {
  const store = _internal_getStore();

  return editorManager.nsmEditorManagerSlice.get(store.state);
};

export const editorManagerProxyEffects = [];

export const track = editorManager.nsmEditorManagerSlice.track.bind(
  editorManager.nsmEditorManagerSlice,
);

export function searchByTag(
  dispatchSerialOperation: DispatchSerialOperationType,
  tagValue: string,
) {
  dispatchSerialOperation({
    name: EXECUTE_SEARCH_OPERATION,
    value: `tag:${tagValue}`,
  });
}
// WARNING: Do not expose editor to react, get can use get methods below
export function useEditor() {
  const { focusedEditorId, primaryEditor } = useNsmSliceState(
    editorManager.nsmEditorManagerSlice,
  );

  return useMemo(() => {
    return { focusedEditorId, primaryEditor };
  }, [focusedEditorId, primaryEditor]);
}

export const updateEditorSearchQuery = (
  searchQuery: RegExp | undefined,
): void => {
  _internal_getStore().dispatch(editorManager.updateQueryAction(searchQuery));
};

export function getEditor(editorId: EditorIdType) {
  const store = _internal_getStore();

  return editorManager.getEditor(store.state, editorId);
}

export function getPrimaryEditor() {
  const store = _internal_getStore();

  return editorManager.getEditor(store.state, PRIMARY_EDITOR_INDEX);
}

export function getFocusedWsPath(): WsPath | undefined {
  const store = _internal_getStore();

  let focused = editorManager.nsmEditorManagerSlice.get(
    store.state,
  ).focusedEditorId;

  if (typeof focused === 'number') {
    return nsmSliceWorkspace
      .get(store.state)
      .openedWsPaths.getByIndex2(focused);
  }

  return undefined;
}

export const onFocusUpdate = (
  ...args: Parameters<typeof editorManager.onFocusUpdate>
): void => {
  const store = _internal_getStore();
  store.dispatch(editorManager.onFocusUpdate(...args));
};

export function toggleEditing(): void {
  const store = _internal_getStore();

  store.dispatch(editorManager.toggleEditing());
}

export function focusEditorIfNotFocused(): void {
  const store = _internal_getStore();

  editorManager.focusEditorIfNotFocused(store.state);
}

export function dispatchEditorCommand<T>(
  editorId: EditorIdType,
  cmdCallback: (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView,
  ) => T,
): T | false {
  const currentEditor = getEditor(editorId);

  if (!currentEditor) {
    return false;
  }

  const view = currentEditor.view;

  return cmdCallback(view.state, view.dispatch, view);
}

import { useMemo } from 'react';

import { PluginKey } from '@bangle.dev/pm';
import { search } from '@bangle.dev/search';

import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import { changeEffect, createSliceWithSelectors, Slice } from '@bangle.io/nsm';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type { WsPath } from '@bangle.io/shared-types';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';
import * as editorManager from '@bangle.io/slice-editor-manager';

import { getStore } from '../internals';

export const searchPluginKey = new PluginKey('searchPluginKey');

const initState: {
  searchQuery: RegExp | undefined;
} = {
  searchQuery: undefined,
};

type EditorProxyState = typeof initState;

export const editorState = () => {
  const store = getStore();

  return editorManager.nsmEditorManagerSlice.resolveState(store.state);
};

export const _editorManagerProxy = createSliceWithSelectors(
  [editorManager.nsmEditorManagerSlice],
  {
    name: 'api-editor-manager-proxy',
    initState,
    selectors: {},
  },
);

Slice.registerEffectSlice(_editorManagerProxy, [
  changeEffect(
    'set-editor-search-query',
    {
      searchQuery: _editorManagerProxy.pick((s) => s.searchQuery),
      editorManagerState: editorManager.nsmEditorManagerSlice.passivePick(
        (s) => s,
      ),
    },
    ({ searchQuery, editorManagerState }) => {
      editorManager.forEachEditorPlain(editorManagerState, (editor) => {
        search.updateSearchQuery(searchPluginKey, searchQuery)(
          editor.view.state,
          editor.view.dispatch,
        );
      });
    },
  ),
  changeEffect(
    'clear-editor-search-query',
    {
      wsName: nsmSliceWorkspace.pick((s) => s.wsName),
      editorManagerState: editorManager.nsmEditorManagerSlice.passivePick(
        (s) => s,
      ),
    },
    ({ wsName, editorManagerState }) => {
      editorManager.forEachEditorPlain(editorManagerState, (editor) => {
        search.updateSearchQuery(searchPluginKey, undefined)(
          editor.view.state,
          editor.view.dispatch,
        );
      });
    },
  ),
]);

const _updateQueryAction = _editorManagerProxy.createAction(
  'updateEditorSearchQuery',
  (searchQuery: RegExp | undefined) => {
    return (state): EditorProxyState => {
      return {
        ...state,
        searchQuery,
      };
    };
  },
);

export const pick = editorManager.nsmEditorManagerSlice.pick;
export const passivePick = editorManager.nsmEditorManagerSlice.passivePick;

// WARNING: Do not expose editor to react, get can use get methods below
export function useEditor() {
  const { focusedEditorId } = useNsmSliceState(
    editorManager.nsmEditorManagerSlice,
  );

  return useMemo(() => {
    return { focusedEditorId };
  }, [focusedEditorId]);
}

export const updateEditorSearchQuery = (
  searchQuery: RegExp | undefined,
): void => {
  getStore().dispatch(_updateQueryAction(searchQuery));
};

export function getEditor(editorId: EditorIdType) {
  const store = getStore();

  return editorManager.getEditor(store.state, editorId);
}

export function getPrimaryEditor() {
  const store = getStore();

  return editorManager.getEditor(store.state, PRIMARY_EDITOR_INDEX);
}

export function getFocusedWsPath(): WsPath | undefined {
  const store = getStore();

  let focused = editorManager.nsmEditorManagerSlice.resolveState(
    store.state,
  ).focusedEditorId;

  if (typeof focused === 'number') {
    return nsmSliceWorkspace
      .resolveState(store.state)
      .openedWsPaths.getByIndex2(focused);
  }

  return undefined;
}

export function toggleEditing(): void {
  const store = getStore();

  store.dispatch(editorManager.toggleEditing(store.state));
}

export function focusEditorIfNotFocused(): void {
  const store = getStore();

  editorManager.focusEditorIfNotFocused(store.state);
}

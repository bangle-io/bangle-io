import { useMemo } from 'react';

import { PluginKey } from '@bangle.dev/pm';
import { search } from '@bangle.dev/search';

import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import { changeEffect, createSliceWithSelectors, Slice } from '@bangle.io/nsm';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';
import {
  forEachEditor,
  getEditor as _getEditor,
  nsmEditorManagerSlice,
} from '@bangle.io/slice-editor-manager';

import { getStore } from '../internals';

export const searchPluginKey = new PluginKey('searchPluginKey');

const initState: {
  searchQuery: RegExp | undefined;
} = {
  searchQuery: undefined,
};

type EditorProxyState = typeof initState;

export const _editorManagerProxy = createSliceWithSelectors(
  [nsmEditorManagerSlice],
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
      editorManagerState: nsmEditorManagerSlice.passivePick((s) => s),
    },
    ({ searchQuery, editorManagerState }) => {
      forEachEditor(editorManagerState, (editor) => {
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
      editorManagerState: nsmEditorManagerSlice.passivePick((s) => s),
    },
    ({ wsName, editorManagerState }) => {
      forEachEditor(editorManagerState, (editor) => {
        search.updateSearchQuery(searchPluginKey, undefined)(
          editor.view.state,
          editor.view.dispatch,
        );
      });
    },
  ),
]);

export const pick = nsmEditorManagerSlice.pick;
export const passivePick = nsmEditorManagerSlice.passivePick;

// WARNING: Do not expose editor to react, get can use get methods below
export function useEditor() {
  const { focusedEditorId } = useNsmSliceState(nsmEditorManagerSlice);

  return useMemo(() => {
    return { focusedEditorId };
  }, [focusedEditorId]);
}

export const updateEditorSearchQuery = _editorManagerProxy.createAction(
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

export function getEditor(editorId: EditorIdType) {
  const store = getStore();

  return _getEditor(store.state, editorId);
}

export function getPrimaryEditor() {
  const store = getStore();

  return _getEditor(store.state, PRIMARY_EDITOR_INDEX);
}

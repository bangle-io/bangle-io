import React, { useMemo } from 'react';

import {
  useNsmSlice,
  useNsmStore,
  useSliceState,
} from '@bangle.io/bangle-store-context';
import type { ApplicationStore } from '@bangle.io/create-store';

import { editorManagerSliceKey } from './constants';
import { nsmEditorManagerSlice } from './nsm-editor-manager-slice';
import type { EditorSliceState } from './types';

export type EditorManagerContextValue = EditorSliceState & {
  bangleStore: ApplicationStore;
};

export function useEditorManagerContext() {
  const { sliceState, store } = useSliceState(editorManagerSliceKey);

  return useMemo(() => {
    return {
      ...sliceState,
      bangleStore: store,
    };
  }, [store, sliceState]);
}

export function useNsmEditorManagerState() {
  const [state] = useNsmSlice(nsmEditorManagerSlice);

  return state;
}
export function useNsmEditorManagerStore() {
  const editorStore = useNsmStore([nsmEditorManagerSlice]);

  return editorStore;
}

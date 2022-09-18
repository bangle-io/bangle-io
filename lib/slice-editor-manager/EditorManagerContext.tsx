import React, { useContext, useMemo } from 'react';

import {
  initialBangleStore,
  useSliceState,
} from '@bangle.io/bangle-store-context';
import type { ApplicationStore } from '@bangle.io/create-store';

import { editorManagerSliceKey } from './constants';
import { initialEditorSliceState } from './editor-manager-slice';
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

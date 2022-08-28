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

// type EditorsType = [BangleEditor | undefined, BangleEditor | undefined];
const EditorManagerContext = React.createContext<EditorManagerContextValue>({
  ...initialEditorSliceState,
  bangleStore: initialBangleStore,
});

export function useEditorManagerContext() {
  return useContext(EditorManagerContext);
}

/**
 * Should be parent of all editors.
 */
export function EditorManager({ children }: { children: React.ReactNode }) {
  const { sliceState: editorManager, store } = useSliceState(
    editorManagerSliceKey,
  );

  const value = useMemo(() => {
    return {
      ...(editorManager || initialEditorSliceState),
      bangleStore: store,
    };
  }, [store, editorManager]);

  return (
    <EditorManagerContext.Provider value={value}>
      {children}
    </EditorManagerContext.Provider>
  );
}

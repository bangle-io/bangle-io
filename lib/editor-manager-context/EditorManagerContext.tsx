import React, { useContext, useMemo } from 'react';

import { useSliceState } from '@bangle.io/app-state-context';

import {
  EditorDispatchType,
  editorManagerSliceKey,
  EditorSliceState,
  initialEditorSliceState,
} from './editor-slice';

const LOG = false;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

export type EditorManagerContextValue = EditorSliceState & {
  dispatch: EditorDispatchType;
};

// type EditorsType = [BangleEditor | undefined, BangleEditor | undefined];
const EditorManagerContext = React.createContext<EditorManagerContextValue>({
  ...initialEditorSliceState,
  dispatch: () => {},
});

export function useEditorManagerContext() {
  return useContext(EditorManagerContext);
}

/**
 * Should be parent of all editors.
 */
export function EditorManager({ children }) {
  /**
   * Understanding common loading patterns
   *
   * # Opening an Existing file
   *
   * 1. User somehow clicks on a file and triggers pushWsPath
   * 2. That then becomes a wsPath derived from history.location
   * 3. A <Editor /> gets mounted with new wsPath
   * 4. At this point the editor is loaded with empty doc.
   * 5. @bangle.io/collab-extension's collab-client sets up communication with worker thread.
   * 6. Worker thread has a collab-manager instance running.
   * 7. When collab-client calls getDocument, it is passed on to worker thread's manager
   * 8. manager calls localDisk.getItem to get the document from indexdb.
   * 9. Collab-client plugin refreshes the editor with correct content
   */
  const { sliceState: editorManager, store } = useSliceState(
    editorManagerSliceKey,
    initialEditorSliceState,
  );

  const value = useMemo(() => {
    return {
      ...(editorManager || initialEditorSliceState),
      dispatch: store.dispatch,
    };
  }, [store, editorManager]);

  return (
    <EditorManagerContext.Provider value={value}>
      {children}
    </EditorManagerContext.Provider>
  );
}

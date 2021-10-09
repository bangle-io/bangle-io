import type { BangleEditor } from '@bangle.dev/core';
import { getIdleCallback } from '@bangle.dev/utils';
import React, { useContext, useEffect, useMemo, useState } from 'react';

const LOG = false;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

const MAX_EDITOR = 2;

interface EditorManagerContextValue {
  setEditor: (editorId: number, editor: BangleEditor) => void;
  primaryEditor: BangleEditor | undefined;
  getEditor: (editorId: number) => BangleEditor | undefined;
  forEachEditor: (cb: (editor: BangleEditor, index: number) => void) => void;
}

type EditorsType = [BangleEditor | undefined, BangleEditor | undefined];
const EditorManagerContext = React.createContext<EditorManagerContextValue>({
  setEditor: () => {},
  primaryEditor: undefined,
  getEditor: () => undefined,
  forEachEditor: () => {},
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
   * 5. Collab-extension's collab-client sets up communication with worker thread.
   * 6. Worker thread has a collab-manager instance running.
   * 7. When collab-client calls getDocument, it is passed on to worker thread's manager
   * 8. manager calls localDisk.getItem to get the document from indexdb.
   * 9. Collab-client plugin refreshes the editor with correct content
   */
  const [editors, _setEditor] = useState<EditorsType>([undefined, undefined]);
  const [primaryEditor, secondaryEditor] = editors;
  const value = useMemo(() => {
    const setEditor: EditorManagerContextValue['setEditor'] = (
      editorId,
      editor,
    ) => {
      _setEditor((array) => {
        if (editorId > MAX_EDITOR) {
          throw new Error(`Only ${MAX_EDITOR + 1} allowed`);
        }
        const newArray = array.slice(0) as EditorsType;
        newArray[editorId] = editor;
        return newArray;
      });
    };

    const [primaryEditor] = editors;
    const getEditor: EditorManagerContextValue['getEditor'] = (editorId) => {
      return editors[editorId];
    };

    const forEachEditor: EditorManagerContextValue['forEachEditor'] = (cb) => {
      editors.forEach((editor, index) => {
        if (editor) {
          cb(editor, index);
        }
      });
    };

    return {
      setEditor,
      primaryEditor,
      getEditor,
      forEachEditor,
    };
  }, [_setEditor, editors]);

  useEffect(() => {
    (window as any).primaryEditor = primaryEditor;
  }, [primaryEditor]);
  useEffect(() => {
    (window as any).secondaryEditor = secondaryEditor;
  }, [secondaryEditor]);

  useEffect(() => {
    // TODO: this setup should be done in app
    getIdleCallback(() => {
      if (
        new URLSearchParams(window.location.search).get('debug_pm') === 'yes' &&
        editors[0]
      ) {
        import(
          /* webpackChunkName: "prosemirror-dev-tools" */ 'prosemirror-dev-tools'
        ).then((args) => {
          args.applyDevTools(editors[0]!.view);
        });
      }
    });
  }, [editors]);

  return (
    <EditorManagerContext.Provider value={value}>
      {children}
    </EditorManagerContext.Provider>
  );
}

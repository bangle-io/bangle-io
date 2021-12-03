import React, { useContext, useEffect, useMemo, useState } from 'react';

import type { BangleEditor } from '@bangle.dev/core';
import type { EditorState, EditorView } from '@bangle.dev/pm';
import { getIdleCallback } from '@bangle.dev/utils';

const LOG = false;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

const MAX_EDITOR = 2;

interface EditorManagerContextValue {
  focusedEditorId: number | undefined;
  forEachEditor: (cb: (editor: BangleEditor, index: number) => void) => void;
  getEditor: (editorId: number) => BangleEditor | undefined;
  getEditorState: (editorId: number) => EditorState | undefined;
  getEditorView: (editorId: number) => EditorView | undefined;
  primaryEditor: BangleEditor | undefined;
  secondaryEditor: BangleEditor | undefined;
  setEditor: (editorId: number, editor: BangleEditor) => void;
  updateFocusedEditor: (editorId: number | undefined) => void;
}

type EditorsType = [BangleEditor | undefined, BangleEditor | undefined];
const EditorManagerContext = React.createContext<EditorManagerContextValue>({
  focusedEditorId: undefined,
  forEachEditor: () => {},
  getEditor: () => undefined,
  getEditorState: () => undefined,
  getEditorView: () => undefined,
  primaryEditor: undefined,
  secondaryEditor: undefined,
  setEditor: () => {},
  updateFocusedEditor: () => {},
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
  const [editors, _setEditor] = useState<EditorsType>([undefined, undefined]);
  const [focusedEditorId, updateFocusedEditorId] = useState<
    number | undefined
  >();
  const [primaryEditor, secondaryEditor] = editors;

  const value: EditorManagerContextValue = useMemo(() => {
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

    const updateFocusedEditor: EditorManagerContextValue['updateFocusedEditor'] =
      (editorId: number | undefined) => {
        updateFocusedEditorId(editorId);
      };

    const getEditorView: EditorManagerContextValue['getEditorView'] = (
      editorId: number,
    ): EditorView | undefined => {
      if (editorId == null) {
        return undefined;
      }
      let editor = editors[editorId];
      if (!editor || editor.destroyed) {
        return undefined;
      }
      return editor.view;
    };

    return {
      focusedEditorId,
      forEachEditor,
      getEditor,
      getEditorState: (editorId: number): EditorState | undefined => {
        return getEditorView(editorId)?.state;
      },
      getEditorView,
      primaryEditor: editors[0],
      secondaryEditor: editors[1],
      setEditor,
      updateFocusedEditor,
    };
  }, [_setEditor, focusedEditorId, editors]);

  useEffect(() => {
    (window as any).primaryEditor = primaryEditor;
  }, [primaryEditor]);
  useEffect(() => {
    (window as any).secondaryEditor = secondaryEditor;
  }, [secondaryEditor]);

  useEffect(() => {
    // TODO: this setup should be done in app
    getIdleCallback(() => {
      if (window.location?.hash?.includes('debug_pm') && editors[0]) {
        console.log('debugging pm');
        import(
          /* webpackChunkName: "prosemirror-dev-tools" */ 'prosemirror-dev-tools'
        ).then((args) => {
          args.applyDevTools(editors[0]!.view);
        });
      }
    });
  }, [editors]);

  useEffect(() => {
    let editor = primaryEditor;
    return () => {
      if (editor) {
        if (!editor.destroyed) {
          editor.destroy();
        }
        (editor as any).view = null;
      }
    };
  }, [primaryEditor]);
  useEffect(() => {
    let editor = secondaryEditor;
    return () => {
      if (editor) {
        if (!editor.destroyed) {
          editor.destroy();
        }
        (editor as any).view = null;
      }
    };
  }, [secondaryEditor]);
  return (
    <EditorManagerContext.Provider value={value}>
      {children}
    </EditorManagerContext.Provider>
  );
}

import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { parseCollabResponse } from '@bangle.dev/collab-server';
import { config } from 'config/index';
import { getIdleCallback } from '@bangle.dev/core/utils/js-utils';
import { UIManagerContext } from 'ui-context/index';
import { bangleIOContext } from 'create-bangle-io-context/index';
import { naukarWorkerProxy } from 'naukar-proxy/index';

const LOG = false;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

const maxEditors = [undefined, undefined];
const MAX_EDITOR = maxEditors.length;

export const EditorManagerContext = React.createContext({});

/**
 * Should be parent of all editors.
 */
export function EditorManager({ children }) {
  const { sendRequest } = useManager();
  const [editors, _setEditor] = useState(maxEditors);
  const [primaryEditor, secondaryEditor] = editors;
  const { paletteType } = useContext(UIManagerContext);
  const value = useMemo(() => {
    const setEditor = (editorId, editor) => {
      _setEditor((array) => {
        if (editorId > MAX_EDITOR) {
          throw new Error(`Only ${MAX_EDITOR + 1} allowed`);
        }
        const newArray = array.slice(0);
        newArray[editorId] = editor;
        return newArray;
      });
    };

    const [primaryEditor] = editors;
    const getEditor = (editorId) => {
      return editors[editorId];
    };
    if (!sendRequest) {
      return {};
    }
    return {
      sendRequest,
      setEditor,
      primaryEditor,
      getEditor,
      bangleIOContext,
    };
  }, [sendRequest, _setEditor, editors]);

  useEffect(() => {
    if (!paletteType) {
      rafEditorFocus(primaryEditor);
    }
  }, [paletteType, primaryEditor]);

  useEffect(() => {
    if (!paletteType) {
      rafEditorFocus(secondaryEditor);
    }
    return () => {};
  }, [paletteType, secondaryEditor]);

  useEffect(() => {
    if (!config.isIntegration) {
      window.editor = editors[0];
      window.editors = editors;
      getIdleCallback(() => {
        if (
          new URLSearchParams(window.location.search).get('debug_pm') ===
            'yes' &&
          editors[0]
        ) {
          import(
            /* webpackChunkName: "prosemirror-dev-tools" */ 'prosemirror-dev-tools'
          ).then((args) => {
            args.applyDevTools(editors[0].view);
          });
        }
      });
    }
  }, [editors]);

  return (
    <EditorManagerContext.Provider value={value}>
      {sendRequest && children}
    </EditorManagerContext.Provider>
  );
}

/**
 * Understanding common loading patterns
 *
 * # Opening an Existing file
 *
 * 1. User somehow clicks on a file and triggers pushWsPath
 * 2. That then becomes a wsPath derived from history.location
 * 3. A <Editor /> gets mounted with new wsPath
 * 4. At this point the editor is loaded with empty doc.
 * 5. localDisk.getItem is called to get the document
 * 6. Collab plugin refreshed the editor with correct content
 */
function useManager() {
  const sendRequest = useCallback(async (...args) => {
    return naukarWorkerProxy.handleCollabRequest(...args).then((obj) => {
      return parseCollabResponse(obj);
    });
  }, []);

  return { sendRequest: sendRequest };
}

function rafEditorFocus(editor) {
  if (editor && !editor.view.hasFocus()) {
    requestAnimationFrame(() => {
      editor.view.focus();
    });
  }
}

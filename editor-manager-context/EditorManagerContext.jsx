import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { LocalDisk } from '@bangle.dev/collab-client';
import { Manager } from '@bangle.dev/collab-server';
import { getNote, saveNote } from 'workspace/index';
import { config } from 'config/index';
import { getIdleCallback } from '@bangle.dev/core/utils/js-utils';
import { BangleIOContext } from 'bangle-io-context/index';
import { frontMatterMarkdownItPlugin } from '@bangle.dev/markdown-front-matter';

import { getPlugins, rawSpecs } from 'editor/index';
import { UIManagerContext } from 'ui-context/index';
import inlineCommandPalette from 'inline-command-palette/index';
import inlineBacklinkPalette from 'inline-backlink/index';
import collapsibleHeading from 'collapsible-heading/index';
import imageExtension from 'image-extension/index';
import inlineEmoji from 'inline-emoji/index';
const LOG = false;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

const maxEditors = [undefined, undefined];
const MAX_EDITOR = maxEditors.length;

const defaultContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: {
        level: 2,
      },
      content: [
        {
          type: 'text',
          text: 'Hi there,',
        },
      ],
    },
  ],
};

// TODO move this async, i think a promise should be fine.
const bangleIOContext = new BangleIOContext({
  coreRawSpecs: rawSpecs,
  getCorePlugins: getPlugins,
  extensions: [
    inlineCommandPalette,
    inlineBacklinkPalette,
    collapsibleHeading,
    imageExtension,
    inlineEmoji,
  ],
  markdownItPlugins: [frontMatterMarkdownItPlugin],
});
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
      {children}
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
  const [manager] = useState(
    () =>
      new Manager(bangleIOContext.specRegistry.schema, {
        disk: localDisk(defaultContent),
      }),
  );

  useEffect(() => {
    return () => {
      log('destroying manager');
      manager.destroy();
    };
  }, [manager]);

  const sendRequest = useCallback(
    (...args) => manager.handleRequest(...args).then((resp) => resp.body),
    [manager],
  );

  return { manager, sendRequest };
}

function localDisk(defaultContent) {
  return new LocalDisk({
    getItem: async (wsPath) => {
      log('getItem', wsPath);
      const doc = await getNote(bangleIOContext, wsPath);
      if (!doc) {
        return defaultContent;
      }
      return doc;
    },
    setItem: async (wsPath, doc) => {
      log('setItem', wsPath);

      await saveNote(bangleIOContext, wsPath, doc);
    },
  });
}

function rafEditorFocus(editor) {
  if (editor && !editor.view.hasFocus()) {
    requestAnimationFrame(() => {
      editor.view.focus();
    });
  }
}

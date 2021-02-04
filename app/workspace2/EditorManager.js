import React, { useEffect, useState, useReducer, useCallback } from 'react';
import { LocalDisk } from '@bangle.dev/collab/client/local-disk';
import { Manager } from '@bangle.dev/collab/server/manager';
import { specRegistry } from '../editor/spec-sheet';
import { defaultContent } from '../components/constants';
import { applyTheme } from '../style/apply-theme';
import { getDoc, saveDoc } from './file-helpers';

const LOG = true;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

export const EditorManagerContext = React.createContext();
const DEFAULT_PALETTE = 'file';

const reducer = (state, action) => {
  log('Received', action.type, { action });
  switch (action.type) {
    case 'UI/TOGGLE_SIDEBAR': {
      return {
        ...state,
        sidebar: !state.sidebar,
      };
    }
    case 'UI/OPEN_PALETTE': {
      return {
        ...state,
        paletteType: action.value.type || DEFAULT_PALETTE,
        paletteInitialQuery: action.value.initialQuery,
      };
    }
    case 'UI/TOGGLE_PALETTE': {
      return {
        ...state,
        paletteType: state.paletteType
          ? undefined
          : action.paletteType || DEFAULT_PALETTE,
      };
    }
    case 'UI/CLOSE_PALETTE': {
      return {
        ...state,
        paletteType: undefined,
      };
    }
    case 'UI/TOGGLE_THEME': {
      const theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', theme);
      applyTheme(theme);
      return {
        ...state,
        theme,
      };
    }

    case 'WORKSPACE/PERMISSION': {
      return {
        ...state,
        wsPermission: action.value,
      };
    }

    default:
      throw new Error(`Unrecognized action "${action.type}"`);
  }
};

export function EditorManager({ children }) {
  const { sendRequest } = useManager();
  const [editorManagerState, dispatch] = useReducer(
    reducer,
    {
      sendRequest,
      // UI
      sidebar: false,
      paletteType: undefined,
      paletteInitialQuery: undefined,
      theme: localStorage.getItem('theme') || 'light',
      wsPermission: undefined,
    },
    (store) => {
      applyTheme(store.theme);
      return store;
    },
  );

  window.editorManagerState = editorManagerState;

  return (
    <EditorManagerContext.Provider value={{ editorManagerState, dispatch }}>
      {children}
    </EditorManagerContext.Provider>
  );
}

function useManager() {
  const [manager] = useState(
    () =>
      new Manager(specRegistry.schema, {
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
      const doc = await getDoc(wsPath);
      if (!doc) {
        return defaultContent;
      }
      return doc;
    },
    setItem: async (wsPath, doc) => {
      await saveDoc(wsPath, doc);
    },
  });
}

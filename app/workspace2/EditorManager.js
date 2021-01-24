import React, { useEffect, useState, useReducer, useCallback } from 'react';
import { LocalDisk } from '@bangle.dev/collab/client/local-disk';
import { Manager } from '@bangle.dev/collab/server/manager';
import { specRegistry } from '../editor/spec-sheet';
import { defaultContent } from '../components/constants';
import { applyTheme } from '../style/apply-theme';
import { getDoc, saveDoc } from './Workspace';
import { useParams } from 'react-router-dom';

const LOG = true;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

const WS_NAME = 'test3';
const DOC_NAME = 'dslkqk';
const WS_PATH = WS_NAME + ':' + DOC_NAME;

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
        paletteType: action.paletteType || DEFAULT_PALETTE,
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

    case 'WORKSPACE/OPEN_DOC': {
      return {
        ...state,
        openedDocs: [
          {
            key: (state.openedDocs[0]?.key || 0) + 1,
            wsPath: state.wsName + ':' + action.docName,
          },
        ],
      };
    }

    case 'WORKSPACE/PERMISSION': {
      return {
        ...state,
        wsPermission: action.value,
      };
    }

    case 'WORKSPACE/IS_PERMISSION_PROMPT_ACTIVE': {
      return {
        ...state,
        wsIsPermissionPromptActive: action.value,
      };
    }

    case 'WORKSPACE/CLOSE_DOC': {
      return {
        ...state,
        openedDocs: action.openedDocs,
      };
    }
    case 'WORKSPACE/OPEN': {
      return {
        ...state,
        wsName: action.wsName,
        openedDocs: [],
      };
    }
    case 'WORKSPACE/OPEN_WS_PATH': {
      return {
        ...state,
        openedDocs: [
          {
            key: (state.openedDocs[0]?.key || 0) + 1,
            wsPath: action.value,
          },
        ],
      };
    }

    default:
      throw new Error(`Unrecognized action "${action.type}"`);
  }
};

export function EditorManager({ children }) {
  const { sendRequest } = useManager();
  let { wsName } = useParams();

  const [editorManagerState, dispatch] = useReducer(
    reducer,
    {
      sendRequest,
      openedDocs: [{ key: 1, wsPath: WS_PATH }],
      // UI
      sidebar: false,
      paletteType: undefined,
      theme: localStorage.getItem('theme') || 'light',
      wsName: wsName,
      wsIsPermissionPromptActive: false,
      wsPermission: undefined,
    },
    (store) => {
      applyTheme(store.theme);
      return store;
    },
  );

  useEffect(() => {
    dispatch({
      type: 'WORKSPACE/OPEN',
      wsName,
    });
  }, [wsName]);

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

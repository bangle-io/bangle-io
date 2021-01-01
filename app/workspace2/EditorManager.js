import React, {
  useEffect,
  useState,
  useReducer,
  useMemo,
  useCallback,
} from 'react';
import { LocalDisk } from '@bangle.dev/collab/client/local-disk';
import { Manager } from '@bangle.dev/collab/server/manager';
import { specRegistry } from '../editor/spec-sheet';
import { defaultContent } from '../components/constants';

const LOG = true;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

const DOCNAME = 'bangle-61:8o4fja';

export const EditorManagerContext = React.createContext();

export function EditorManager({ children }) {
  const { sendRequest } = useManager();

  const reducer = useMemo(
    () => (state, action) => {
      return state;
    },
    [],
  );

  const [editorManagerState, dispatch] = useReducer(reducer, {
    openedDocs: [{ key: 1, docName: DOCNAME }],
    sendRequest,
  });

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
    getItem: async (docName) => {
      const saved = localStorage.getItem(docName);
      if (!saved) {
        log('not found', docName);
        return defaultContent;
      }
      log('getting', docName, JSON.parse(saved));

      return JSON.parse(saved);
    },
    setItem: async (docName, doc) => {
      const docJson = doc.toJSON();
      log('setitem', docName);
      localStorage.setItem(docName, JSON.stringify(docJson));
    },
  });
}

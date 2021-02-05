import React, { useEffect, useState, useReducer, useCallback } from 'react';
import { LocalDisk } from '@bangle.dev/collab/client/local-disk';
import { Manager } from '@bangle.dev/collab/server/manager';
import { specRegistry } from '../editor/spec-sheet';
import { defaultContent } from '../components/constants';
import { getDoc, saveDoc } from './file-helpers';

const LOG = true;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

export const EditorManagerContext = React.createContext();

export function EditorManager({ children }) {
  const { sendRequest } = useManager();

  return (
    <EditorManagerContext.Provider
      value={{ editorManagerState: { sendRequest } }}
    >
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

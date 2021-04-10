import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { LocalDisk } from '@bangle.dev/collab/client/local-disk';
import { Manager } from '@bangle.dev/collab/server/manager';
import { specRegistry } from 'editor/index';
import { getDoc, saveDoc } from 'workspace/index';
import { defaultContent } from './editor-default-content';

const LOG = false;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

export const EditorManagerContext = React.createContext();

/**
 * Should be parent of all editors.
 */
export function EditorManager({ children }) {
  const { sendRequest } = useManager();
  const [primaryEditor, setPrimaryEditor] = useState();

  const value = useMemo(() => {
    return { sendRequest, setPrimaryEditor, primaryEditor };
  }, [sendRequest, setPrimaryEditor, primaryEditor]);

  return (
    <EditorManagerContext.Provider value={value}>
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

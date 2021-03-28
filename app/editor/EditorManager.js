import './style.css';
import '@bangle.dev/core/style.css';
import '@bangle.dev/tooltip/style.css';
import './extensions-override.css';
import '@bangle.dev/emoji/style.css';
import '@bangle.dev/react-menu/style.css';
import '@bangle.dev/react-emoji-suggest/style.css';
import '@bangle.dev/markdown-front-matter/style.css';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { LocalDisk } from '@bangle.dev/collab/client/local-disk';
import { Manager } from '@bangle.dev/collab/server/manager';
import { specRegistry } from './spec-sheet';
import { defaultContent } from '../components/constants';
import { getDoc, saveDoc } from '../workspace/file-helpers';
import * as Comlink from 'comlink';
// eslint-disable-next-line import/no-webpack-loader-syntax
import MyWorker from './my-worker.shared-worker.js';
const LOG = true;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

export const EditorManagerContext = React.createContext();

/**
 * Should be parent of all editors.
 */
export function EditorManager({ children }) {
  const { sendRequest } = useManager();

  const value = useMemo(() => {
    return { sendRequest };
  }, [sendRequest]);

  return (
    <EditorManagerContext.Provider value={value}>
      {children}
    </EditorManagerContext.Provider>
  );
}

const getDocWrap = Comlink.proxy(getDoc);
const saveDocWrap = Comlink.proxy(saveDoc);

function useManager() {
  const [manager] = useState(() => {
    const piWorker = new MyWorker();

    const obj = Comlink.wrap(piWorker.port);
    return obj;
  });

  useEffect(() => {
    return () => {
      log('destroying manager');
      manager.destroy();
    };
  }, [manager]);

  const sendRequest = useCallback(
    (...args) => {
      console.log('sending', ...args);
      return manager
        .handleRequest(getDocWrap, saveDocWrap, ...args)
        .then((resp) => resp.body);
    },
    [manager],
  );

  return { manager, sendRequest };
}

// function localDisk(defaultContent) {
//   return new LocalDisk({
//     getItem: async (wsPath) => {
//       const doc = await getDoc(wsPath);
//       if (!doc) {
//         return defaultContent;
//       }
//       return doc;
//     },
//     setItem: async (wsPath, doc) => {
//       await saveDoc(wsPath, doc);
//     },
//   });
// }

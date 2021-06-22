import React, { useEffect, useState, useMemo } from 'react';
import * as Comlink from 'comlink';
import { naukarWorkerProxy } from 'naukar-proxy/index';
import { objectSync } from 'object-sync/index';
import { initialAppState as _initialAppState } from 'shared/index';
import { moduleSupport } from './misc/module-support';
import { AppStateContext } from 'app-state-context/index';
const initialAppState = Object.assign({}, _initialAppState);

const LOG = false;

const log = LOG ? console.log.bind(console, 'AppStateContext') : () => {};

const appState = objectSync(initialAppState, {
  objectName: 'appStateValue',
  emitChange: (event) => {
    naukarWorkerProxy.updateWorkerAppState(event);
  },
});

export function AppStateProvider({ children }) {
  const [appStateValue, updateAppStateValue] = useState({
    appStateValue: initialAppState,
  });

  useEffect(() => {
    const listener = ({ appStateValue }) => {
      log('received appStateChange', appStateValue);
      updateAppStateValue(Object.assign({}, appStateValue));
    };
    appState.registerListener(listener);
    return () => {
      appState.deregisterListener(listener);
    };
  }, []);

  useEffect(() => {
    let receiveWorkerChanges = (event) => appState.applyForeignChange(event);
    if (moduleSupport) {
      receiveWorkerChanges = Comlink.proxy(receiveWorkerChanges);
    }

    naukarWorkerProxy.registerUpdateMainAppStateCallback(receiveWorkerChanges);
  }, []);

  const value = useMemo(() => {
    return {
      mutableAppStateValue: appState.appStateValue,
      appStateValue,
      appState,
    };
  }, [appStateValue]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

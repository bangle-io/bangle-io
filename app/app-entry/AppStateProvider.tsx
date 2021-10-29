import * as Comlink from 'comlink';
import React, { useEffect, useMemo, useState } from 'react';

import { AppStateContext } from '@bangle.io/app-state-context';
import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';
import { objectSync, ObjectSyncCallback } from '@bangle.io/object-sync';
import { initialAppState as _initialAppState } from '@bangle.io/shared';

import { moduleSupport } from './misc/module-support';

const initialAppState = Object.assign({}, _initialAppState);

const LOG = false;

const log = LOG ? console.log.bind(console, 'AppStateContext') : () => {};

const appState = objectSync(initialAppState, {
  emitChange: (event) => {
    naukarWorkerProxy.updateWorkerAppState(event);
  },
});

export function AppStateProvider({ children }) {
  const [appStateValue, updateAppStateValue] = useState(initialAppState);

  useEffect(() => {
    const listener: ObjectSyncCallback<any> = ({ appStateValue }) => {
      log('received appStateChange', appStateValue);
      updateAppStateValue(Object.assign({}, appStateValue) as any);
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

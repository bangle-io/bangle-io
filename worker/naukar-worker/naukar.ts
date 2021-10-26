import { objectSync } from 'object-sync';

import type { Manager } from '@bangle.dev/collab-server';

import { setupCollabManager } from './collab-manager';
import { localDiskSetup } from './local-disk';

const LOG = false;

const log = LOG ? console.log.bind(console, 'naukar') : () => {};

// Things to remember about the return type
// 1. Do not use comlink proxy here, as this function should run in both envs (worker and main)
// 2. Keep the return type simple and flat. Ie. an object whose values are not object.
export function createNaukar({ extensionRegistry, initialAppState }) {
  const envType =
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-restricted-globals, no-undef
    self instanceof WorkerGlobalScope
      ? 'worker'
      : 'window';
  console.debug('Naukar running in ', envType);

  const { appState, updateWorkerAppState, registerUpdateMainAppStateCallback } =
    setupAppState(initialAppState);

  const diskSetup = localDiskSetup(extensionRegistry, appState);
  let manager = setupCollabManager(extensionRegistry, diskSetup.disk);

  const handleCollabRequest: Manager['handleRequest'] = (...args) => {
    return manager.handleRequest(...args);
  };
  return {
    // app state
    updateWorkerAppState,
    registerUpdateMainAppStateCallback,

    // collab
    handleCollabRequest,
    resetManager: () => {
      console.debug('destroying manager');
      manager.destroy();
      manager = setupCollabManager(extensionRegistry, diskSetup.disk);
    },
    flushDisk: async () => {
      await diskSetup.disk.flushAll();
      console.debug('flushed everything');
    },
  };
}

function setupAppState<T>(initialAppState: T): {
  appState: T;
  updateWorkerAppState: any;
  registerUpdateMainAppStateCallback: any;
} {
  const pendingEvents: any[] = [];
  let updateMainAppState;
  const updateWorkerAppState = (event) => {
    appState.applyForeignChange(event);
  };

  const appState = objectSync(initialAppState, {
    objectName: 'appStateValue',
    emitChange: (event) => {
      if (updateMainAppState) {
        updateMainAppState(event);
        return;
      }
      // since we dynamically inject updateMainState cb,
      // it might take a while for it to be injected, so till then
      // save the events.
      pendingEvents.push(event);
    },
  });

  appState.registerListener(({ appStateValue }) => {
    log('appStateValue', appStateValue);
  });

  return {
    appState,
    updateWorkerAppState,
    registerUpdateMainAppStateCallback: (cb) => {
      updateMainAppState = cb;
      while (pendingEvents.length > 0) {
        cb(pendingEvents.pop());
      }
    },
  };
}

export type WorkerAPI = ReturnType<typeof createNaukar>;

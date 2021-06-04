import { setupCollabManager } from './collab-manager';
import { localDiskSetup } from './local-disk';
import { objectSync } from 'object-sync/index';

// Things to remember about the return type
// 1. Do not use comlink proxy here, as this function should run in both envs (worker and main)
// 2. Keep the return type simple and flat. Ie. an object whose values are not object.
export function createNaukar({ bangleIOContext, initialAppState }) {
  const envType =
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-restricted-globals, no-undef
    self instanceof WorkerGlobalScope
      ? 'worker'
      : 'window';
  console.debug('Naukar running in ', envType);

  const { appState, updateWorkerAppState, registerUpdateMainAppStateCallback } =
    setupAppState(initialAppState);

  const diskSetup = localDiskSetup(bangleIOContext, appState);
  const manager = setupCollabManager(bangleIOContext, diskSetup.disk);

  return {
    // app state
    updateWorkerAppState,
    registerUpdateMainAppStateCallback,

    // collab
    handleCollabRequest: (...args) => {
      return manager.handleRequest(...args);
    },
  };
}

function setupAppState(initialAppState) {
  const pendingEvents = [];
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

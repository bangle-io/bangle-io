import { setupCollabManager } from './collab-manager';
import { localDiskSetup } from './local-disk';
import { objectSync } from 'object-sync/index';

export class Naukar {
  pageState;
  oldPageState;
  bangleIOContext;
  manager;
  diskSetup;

  constructor({ bangleIOContext, initialAppState }) {
    const envType =
      typeof WorkerGlobalScope !== 'undefined' &&
      // eslint-disable-next-line no-restricted-globals, no-undef
      self instanceof WorkerGlobalScope
        ? 'worker'
        : 'window';
    console.debug('Naukar running in ', envType);

    const { appState, updateAppState, registerUpdateCallback } =
      setupAppState(initialAppState);
    this.updateAppState = updateAppState;
    this.registerUpdateCallback = registerUpdateCallback;

    const diskSetup = localDiskSetup(bangleIOContext, appState);

    this.manager = setupCollabManager(bangleIOContext, diskSetup.disk);
  }

  handleCollabRequest = async (...args) => {
    return this.manager.handleRequest(...args);
  };
}

function setupAppState(initialAppState) {
  const pendingEvents = [];
  let appStateWorkerToMain;
  const appState = objectSync(initialAppState, (event) => {
    if (appStateWorkerToMain) {
      appStateWorkerToMain(event);
      return;
    }
    pendingEvents.push(event);
  });

  return {
    appState,
    updateAppState: (event) => {
      appState.applyForeignChange(event);
    },
    registerUpdateCallback: (cb) => {
      appStateWorkerToMain = cb;
      while (pendingEvents.length > 0) {
        cb(pendingEvents.pop());
      }
    },
  };
}

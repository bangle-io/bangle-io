import type { Manager } from '@bangle.dev/collab-server';
import { DebouncedDisk } from '@bangle.dev/disk';

import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import { objectSync, ObjectSyncEventType } from '@bangle.io/object-sync';
import { FileOps } from '@bangle.io/workspaces';

import { setupCollabManager } from './collab-manager';

const LOG = false;

const log = LOG ? console.log.bind(console, 'naukar') : () => {};

// Things to remember about the return type
// 1. Do not use comlink proxy here, as this function should run in both envs (worker and main)
// 2. Keep the return type simple and flat. Ie. an object whose values are not object.
export function createNaukar(
  extensionRegistry: ExtensionRegistry,
  initialAppState: { [key: string]: any },
) {
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

function setupAppState<T>(initialAppState: { [key: string]: T }) {
  const pendingEvents: ObjectSyncEventType<T>[] = [];
  let updateMainAppState: undefined | ((event: ObjectSyncEventType<T>) => void);
  const updateWorkerAppState = (event: ObjectSyncEventType<T>) => {
    appState.applyForeignChange(event);
  };

  const appState = objectSync(initialAppState, {
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
    registerUpdateMainAppStateCallback: (
      cb: (event: ObjectSyncEventType<T>) => void,
    ) => {
      updateMainAppState = cb;
      while (pendingEvents.length > 0) {
        const value = pendingEvents.pop();
        if (value) {
          cb(value);
        }
      }
    },
  };
}

export type WorkerAPI = ReturnType<typeof createNaukar>;

function localDiskSetup(
  extensionRegistry: ExtensionRegistry,
  appStateProxy: ReturnType<typeof setupAppState>['appState'],
) {
  const getItem = async (wsPath) => {
    const doc = await FileOps.getDoc(
      wsPath,
      extensionRegistry.specRegistry,
      extensionRegistry.markdownItPlugins,
    );
    return doc;
  };
  const setItem = async (wsPath, doc, version) => {
    await FileOps.saveDoc(wsPath, doc, extensionRegistry.specRegistry);
  };

  return {
    disk: new DebouncedDisk(getItem, setItem, {
      debounceWait: 250,
      debounceMaxWait: 1000,
      onPendingWrites: (size) => {
        appStateProxy.appStateValue.hasPendingWrites = size !== 0;
      },
    }),
  };
}

import type { Manager } from '@bangle.dev/collab-server';
import { DebouncedDisk } from '@bangle.dev/disk';

import {
  PAGE_BLOCK_RELOAD_ACTION_NAME,
  PAGE_BLOCK_RELOAD_ACTION_TYPE,
} from '@bangle.io/constants';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import { objectSync, ObjectSyncEventType } from '@bangle.io/object-sync';
import { getSelfType } from '@bangle.io/utils';
import { FileOps } from '@bangle.io/workspaces';

import { abortableServices } from './abortable-services';
import { setupCollabManager } from './collab-manager';
import { initializeNaukarStore } from './store/initialize-naukar-store';

const LOG = false;

const log = LOG ? console.log.bind(console, 'naukar') : () => {};

type MainActions = PAGE_BLOCK_RELOAD_ACTION_TYPE;
type MainDispatchType = (action: MainActions) => void;
// Things to remember about the return type
// 1. Do not use comlink proxy here, as this function should run in both envs (worker and main)
// 2. Keep the return type simple and flat. Ie. an object whose values are not object.
export function createNaukar(
  extensionRegistry: ExtensionRegistry,
  initialAppState: { [key: string]: any },
) {
  const envType = getSelfType();

  console.debug('Naukar running in ', envType);

  const { updateWorkerAppState, registerUpdateMainAppStateCallback } =
    setupAppState(initialAppState);

  // main-dispatch
  let _mainDispatch;
  let pendingMainActions: MainActions[] = [];
  let mainDispatch = (action: MainActions) => {
    if (!_mainDispatch) {
      pendingMainActions.push(action);
    } else {
      _mainDispatch(action);
    }
  };
  // main-dispatch-end

  const diskSetup = localDiskSetup(extensionRegistry, mainDispatch);
  let manager = setupCollabManager(extensionRegistry, diskSetup.disk);

  const handleCollabRequest: Manager['handleRequest'] = (...args) => {
    return manager.handleRequest(...args);
  };

  let store: ReturnType<typeof initializeNaukarStore> | undefined =
    initializeNaukarStore({});

  return {
    // main action store
    registerMainActionDispatch(cb) {
      _mainDispatch = cb;
      while (pendingMainActions.length > 0) {
        const value = pendingMainActions.pop();
        if (value) {
          cb(value);
        }
      }
    },

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

    ...abortableServices({ extensionRegistry }),
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
  mainDispatch: MainDispatchType,
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
        mainDispatch({
          type: PAGE_BLOCK_RELOAD_ACTION_NAME,
          value: size !== 0,
        });
      },
    }),
  };
}

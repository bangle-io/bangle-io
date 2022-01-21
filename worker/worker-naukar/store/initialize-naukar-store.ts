import { WORKER_STORE_NAME } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { NaukarStateConfig } from '@bangle.io/shared-types';

import { naukarSlices } from './naukar-slices';

const LOG = false;
let log = LOG ? console.debug.bind(console, 'naukar-store') : () => {};

const MAX_DEFERRED_WAIT_TIME = 200;

export function initializeNaukarStore({
  port,
  onUpdate,
  extensionRegistry,
}: {
  onUpdate?: (store: ApplicationStore) => void;
  port: MessagePort;
  extensionRegistry: ExtensionRegistry;
}) {
  const opts: NaukarStateConfig = {
    port,
    extensionRegistry,
  };
  const store = ApplicationStore.create({
    storeName: WORKER_STORE_NAME,
    state: AppState.create({
      opts,
      slices: naukarSlices({ onUpdate }),
    }),
    dispatchAction: (store, action) => {
      log(action);
      let newState = store.state.applyAction(action);
      store.updateState(newState);
      log(newState);
    },
    scheduler: (cb) => {
      const id = setTimeout(cb, MAX_DEFERRED_WAIT_TIME);
      return () => {
        clearTimeout(id);
      };
    },
  });

  // (self as any)._store = store;

  return store;
}

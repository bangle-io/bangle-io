import { WORKER_STORE_NAME } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';

import type { NaukarStateConfig } from '../common';
import type { DocChangeEmitter } from '../doc-change-emitter';
import { naukarSlices } from './naukar-slices';

const LOG = false;
let log = LOG ? console.debug.bind(console, 'naukar-store') : () => {};

const MAX_DEFERRED_WAIT_TIME = 30;

export function initializeNaukarStore({
  port,
  onUpdate,
  extensionRegistry,
  docChangeEmitter,
}: {
  onUpdate?: (store: ApplicationStore) => void;
  port: MessagePort;
  extensionRegistry: ExtensionRegistry;
  docChangeEmitter: DocChangeEmitter;
}) {
  const opts: NaukarStateConfig = {
    port,
    extensionRegistry,
    docChangeEmitter,
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
      // log(newState);
    },
    scheduler: (cb) => {
      const id = setTimeout(cb, MAX_DEFERRED_WAIT_TIME);

      return () => {
        clearTimeout(id);
      };
    },
  });

  // eslint-disable-next-line no-restricted-globals
  (self as any)._store = store;

  return store;
}

import { WORKER_STORE_NAME } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';

import { naukarStateSlices } from './naukar-state-slices';

const LOG = false;
let log = LOG ? console.log.bind(console, 'naukar-store') : () => {};

const MAX_DEFERRED_WAIT_TIME = 200;

export function initializeNaukarStore({
  port,
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
  port: MessagePort;
}) {
  const store = ApplicationStore.create({
    storeName: WORKER_STORE_NAME,
    state: AppState.create({
      opts: {
        port,
      },
      slices: naukarStateSlices({ onUpdate }),
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

  return store;
}

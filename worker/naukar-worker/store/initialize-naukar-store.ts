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
  port: MessageChannel['port2'];
}) {
  const store = ApplicationStore.create({
    storeName: WORKER_STORE_NAME,
    state: AppState.create({ slices: naukarStateSlices({ onUpdate }) }),
    dispatchAction: (store, action) => {
      log(action);
      let newState = store.state.applyAction(action);
      store.updateState(newState);
      log(newState);

      if (!action.fromStore) {
        port.postMessage({
          type: 'action',
          action: store.serializeAction(action),
        });
      }
    },
    scheduler: (cb) => {
      const id = setTimeout(cb, MAX_DEFERRED_WAIT_TIME);
      return () => {
        clearTimeout(id);
      };
    },
  });

  port.onmessage = ({ data }) => {
    if (data?.type === 'action') {
      let parsed = store.parseAction(data.action);
      if (parsed) {
        console.debug('action from main', parsed);
        store.dispatch(parsed);
      }
    }
  };

  port.postMessage('WORKER_READY');

  return store;
}

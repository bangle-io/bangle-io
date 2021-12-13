import deepEqual from 'fast-deep-equal';

import { WORKER_STORE_NAME } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';

import {
  NaukarActionTypes,
  NaukarSliceTypes,
  naukarStateSlices,
} from './naukar-state-slices';

const LOG = false;
let log = LOG ? console.log.bind(console, 'naukar-store') : () => {};

const MAX_DEFERRED_WAIT_TIME = 200;

export function initializeNaukarStore({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  const store = ApplicationStore.create<NaukarSliceTypes, NaukarActionTypes>({
    storeName: WORKER_STORE_NAME,
    state: AppState.create({ slices: naukarStateSlices({ onUpdate }) }),
    dispatchAction: (store, action) => {
      log(action);
      let newState = store.state.applyAction(action);
      store.updateState(newState);
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

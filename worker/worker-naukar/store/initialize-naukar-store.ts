import * as Sentry from '@sentry/browser';

import { WORKER_STORE_NAME } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';

import type { NaukarStateConfig } from '../common';
import { naukarSlices } from './naukar-slices';

const LOG = true;
let log = LOG ? console.debug.bind(console, 'naukar-store') : () => {};

const MAX_DEFERRED_WAIT_TIME = 30;

export function initializeNaukarStore({
  port,
  extensionRegistry,
}: NaukarStateConfig) {
  const opts: NaukarStateConfig = {
    port,
    extensionRegistry,
  };
  const store = ApplicationStore.create({
    storeName: WORKER_STORE_NAME,
    state: AppState.create({
      opts,
      slices: naukarSlices({}),
    }),
    dispatchAction: (store, action) => {
      log(action.name, action.id);

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
    onError(error, store) {
      if (!store.runSliceErrorHandlers(error)) {
        Sentry.captureException(error);
        console.error(error);
        //  TODO show error in UI
      }

      return true;
    },
  });

  return store;
}

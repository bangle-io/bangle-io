import deepEqual from 'fast-deep-equal';

import { MAIN_STORE_NAME } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import {
  safeCancelIdleCallback,
  safeRequestIdleCallback,
} from '@bangle.io/utils';

import {
  BangleActionTypes,
  BangleSliceTypes,
  bangleStateSlices,
} from './bangle-slices';

const LOG = false;
let log = LOG ? console.log.bind(console, 'bangle-store') : () => {};

const MAX_DEFERRED_WAIT_TIME = 400;

export function initializeBangleStore({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  const makeStore = () =>
    ApplicationStore.create<BangleSliceTypes, BangleActionTypes>({
      storeName: MAIN_STORE_NAME,
      state: AppState.create({ slices: bangleStateSlices({ onUpdate }) }),
      dispatchAction: (store, action) => {
        log(action);
        const newState = store.state.applyAction(action);
        store.updateState(newState);
      },
      scheduler: (cb) => {
        const id = safeRequestIdleCallback(cb, {
          timeout: MAX_DEFERRED_WAIT_TIME,
        });
        return () => {
          safeCancelIdleCallback(id);
        };
      },
    });

  let store = makeStore();

  return store;
}

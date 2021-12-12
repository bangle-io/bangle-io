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
      dispatchAction: (store, _action) => {
        let action: typeof _action = JSON.parse(JSON.stringify(_action));

        // We want to ensure that all actions are serializable so that
        // they can be sent across workers.
        // TODO: This is the best way I can currently think of warning
        // us if something is not serializable, but it gives false positive
        // when an objects value is undefined. This is because `{key: undefined}`
        // is serialized as `{}`.
        if (!deepEqual(action, _action)) {
          console.warn('Faulty action "' + _action.name + '":', _action);
        }

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

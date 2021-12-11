import deepEqual from 'fast-deep-equal';

import { ApplicationStore, AppState } from '@bangle.io/create-store';
import {
  safeCancelIdleCallback,
  safeRequestIdleCallback,
} from '@bangle.io/utils';

import {
  BangleActionTypes,
  BangleSliceTypes,
  bangleStateSlices,
} from './bangle-state-slices';

const LOG = false;
let log = LOG ? console.log.bind(console, 'bangle-store') : () => {};

export function initializeBangleStore({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  const store = new ApplicationStore<BangleSliceTypes, BangleActionTypes>(
    AppState.create({ slices: bangleStateSlices({ onUpdate }) }),
    (store, _action) => {
      let action: typeof _action = JSON.parse(JSON.stringify(_action));

      // We want to ensure that all actions are serializable so that
      // they can be sent across workers.
      // TODO: This is the best way I can currently think of warning
      // us if something is not serializable, but it gives false positive
      // when an objects value is undefined. This is because `{key: undefined}`
      // is serialized as `{}`.
      if (!deepEqual(action, _action)) {
        console.warn('Faulty action "' + _action.type + '":', _action);
      }

      log(action);
      let newState = store.state.applyAction(action);
      store.updateState(newState);
    },
    (cb) => {
      const id = safeRequestIdleCallback(cb);
      return () => {
        safeCancelIdleCallback(id);
      };
    },
  );

  return store;
}

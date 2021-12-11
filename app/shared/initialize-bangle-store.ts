import { ApplicationStore, AppState } from '@bangle.io/create-store';
import {
  safeCancelIdleCallback,
  safeRequestIdleCallback,
} from '@bangle.io/utils';

import { bangleStateSlices } from './bangle-state-slices';

const LOG = true;
let log = LOG ? console.log.bind(console, 'bangle-store') : () => {};

export function initializeBangleStore({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  const store = new ApplicationStore(
    AppState.create({ slices: bangleStateSlices({ onUpdate }) }),
    (store, action) => {
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

import { MAIN_STORE_NAME } from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import type { JsonValue } from '@bangle.io/shared-types';
import {
  safeCancelIdleCallback,
  safeRequestIdleCallback,
} from '@bangle.io/utils';

import {
  BangleActionTypes,
  BangleSliceTypes,
  bangleStateSlices,
} from './bangle-slices';
import { persistedSlices } from './persisted-slices';

const LOG = false;
let log = LOG ? console.log.bind(console, 'bangle-store') : () => {};
const persistKey = 'bangle-store-0.124';

const MAX_DEFERRED_WAIT_TIME = 400;

export function initializeBangleStore({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  const makeStore = () => {
    const state = AppState.stateFromJSON({
      slices: bangleStateSlices({
        onUpdate,
        onPageInactive: () => {
          persistState(
            store.state.stateToJSON({ sliceFields: persistedSlices }),
          );
        },
      }),
      json: retrievePersistedState(),
      sliceFields: persistedSlices,
    });

    return ApplicationStore.create<BangleSliceTypes, BangleActionTypes>({
      storeName: MAIN_STORE_NAME,
      state: state,
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
  };

  let store = makeStore();

  return store;
}

function persistState(obj: JsonValue) {
  localStorage.setItem(persistKey, JSON.stringify(obj));
}

function retrievePersistedState(): JsonValue {
  try {
    const item = localStorage.getItem(persistKey);
    if (typeof item === 'string') {
      return JSON.parse(item);
    }
  } catch (error) {
    console.error(error);
  }
  return {};
}

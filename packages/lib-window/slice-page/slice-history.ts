import { cleanup, createKey, ref } from '@nalanda/core';

import {
  BaseHistory,
  BrowserHistory,
  createTo,
  MemoryHistory,
} from '@bangle.io/history';
import { getWindowStoreConfig } from '@bangle.io/lib-common';
import type { Location } from '@bangle.io/shared-types';

/**
 * This slice focuses on initializing the history object
 * and keeping it in sync with the slice location.
 */
const key = createKey('slice-history', []);

// FIELDS
// pending navigation is used to queue up navigation, by user or programmatic actions
// and effect will later pick it up and navigate to it.
const pendingNavigationField = key.field<
  | undefined
  | {
      location: Location;
      replaceHistory?: boolean;
      preserve?: boolean;
    }
>(undefined);
// Location is a mirror of the history state
const locationField = key.field<Location | undefined>(undefined);
const historyLoadedField = key.field<boolean>(false);

// ACTIONS
function syncHistoryStateWithSliceState(location: Location) {
  return locationField.update(location);
}

function goTo(location: Location, replace?: boolean) {
  return pendingNavigationField.update({
    location,
    replaceHistory: replace,
    preserve: true,
  });
}

export const getHistoryRef = ref<BaseHistory | undefined>(() => undefined);

key.effect(
  function watchHistoryEffect(store) {
    const ref = getHistoryRef(store);

    if (ref.current) {
      return;
    }
    const storeConfig = getWindowStoreConfig(store);

    const onHistoryChange = (location: Location) => {
      store.dispatch(syncHistoryStateWithSliceState(location));
    };
    const browserHistory =
      storeConfig.historyType === 'browser'
        ? new BrowserHistory('', onHistoryChange)
        : new MemoryHistory('', onHistoryChange);

    ref.current = browserHistory;

    store.dispatch(historyLoadedField.update(true));

    // initialize the location with current values
    store.dispatch(
      syncHistoryStateWithSliceState({
        search: browserHistory.search,
        pathname: browserHistory.pathname,
      }),
    );

    cleanup(store, () => {
      store.dispatch(historyLoadedField.update(false));
      browserHistory.destroy();
      ref.current = undefined;
    });
  },
  {
    metadata: {
      runImmediately: true,
    },
  },
);

key.effect(
  function pendingNavEffect(store) {
    const pendingNavigation = pendingNavigationField.track(store);

    const history = getHistoryRef(store).current;

    if (!history || !pendingNavigation) {
      return;
    }

    // TODO preserve still needed
    if (pendingNavigation.preserve) {
      history.navigate(createTo(pendingNavigation.location, history), {
        replace: pendingNavigation.replaceHistory,
      });
    } else {
      let to = pendingNavigation.location.pathname ?? '';

      if (pendingNavigation.location.search) {
        to += '?' + pendingNavigation.location.search;
      }
      history.navigate(to, {
        replace: pendingNavigation.replaceHistory,
      });
    }
  },
  {
    metadata: {
      runImmediately: true,
    },
  },
);

export const sliceHistory = key.slice({
  pendingNavigation: pendingNavigationField,
  location: locationField,
  syncPageLocation: syncHistoryStateWithSliceState,
  goTo,
  historyLoaded: historyLoadedField,
});

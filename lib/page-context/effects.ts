import { SliceSideEffect } from '@bangle.io/create-store';

import type { PageSliceAction, PageSliceStateType } from './common';
import { getPageLifeCycleObject } from './common';
import { BrowserHistory } from './history/browser-histroy';

const pendingSymbol = Symbol('pending');

export const blockReloadEffect: SliceSideEffect<
  PageSliceStateType,
  PageSliceAction
> = () => {
  return {
    update(store, __, pageState, prevState) {
      const blockReload = pageState.blockReload;
      const prevValue = prevState.blockReload;

      if (blockReload === prevValue) {
        return;
      }

      if (blockReload) {
        getPageLifeCycleObject(store.state)?.addUnsavedChanges(pendingSymbol);
      }

      if (!blockReload) {
        getPageLifeCycleObject(store.state)?.removeUnsavedChanges(
          pendingSymbol,
        );
      }
    },
  };
};

export const watchPageLifeCycleEffect: SliceSideEffect<
  PageSliceStateType,
  PageSliceAction
> = (store) => {
  const handler = (event) => {
    store.dispatch({
      name: 'action::page-context:UPDATE_PAGE_LIFE_CYCLE_STATE',
      value: {
        current: event.newState,
        previous: event.oldState,
      },
    });
  };

  getPageLifeCycleObject(store.state)?.addEventListener('statechange', handler);

  return {
    destroy() {
      getPageLifeCycleObject(store.state)?.removeEventListener(
        'statechange',
        handler,
      );
    },
  };
};

// sets up history and watches for any changes in it
export const watchHistoryEffect: SliceSideEffect<
  PageSliceStateType,
  PageSliceAction
> = (store) => {
  if (typeof window === 'undefined' || typeof window.history === 'undefined') {
    return {};
  }

  const browserHistory = new BrowserHistory('', (location) => {
    store.dispatch({
      name: 'action::page-context:history-update-location',
      value: { location },
    });
  });

  store.dispatch({
    name: 'action::page-context:history-set-history',
    value: { history: browserHistory },
  });

  return {
    destroy() {
      browserHistory.destroy();
    },
  };
};

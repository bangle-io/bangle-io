import { SliceSideEffect } from '@bangle.io/create-store';

import type { PageSliceAction, PageSliceStateType } from './common';
import { BrowserHistory } from './history/browser-histroy';

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
      name: 'action::@bangle.io/slice-page:history-update-location',
      value: { location },
    });
  });

  store.dispatch({
    name: 'action::@bangle.io/slice-page:history-set-history',
    value: { history: browserHistory },
  });

  return {
    destroy() {
      browserHistory.destroy();
    },
  };
};

import { SliceSideEffect } from '@bangle.io/create-store';

import { PageSliceAction, pageSliceKey, PageSliceStateType } from './common';
import { BrowserHistory } from './history/browser-histroy';
import { createTo } from './history/create-to';

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
    name: 'action::@bangle.io/slice-page:history-update-location',
    value: {
      location: {
        search: browserHistory.search,
        pathname: browserHistory.pathname,
      },
    },
  });

  store.dispatch({
    name: 'action::@bangle.io/slice-page:history-set-history',
    value: { history: browserHistory },
  });

  let lastProcessed: PageSliceStateType['pendingNavigation'];
  return {
    destroy() {
      browserHistory.destroy();
    },
    update(store) {
      const { pendingNavigation } = pageSliceKey.getSliceStateAsserted(
        store.state,
      );

      if (!pendingNavigation) {
        return;
      }

      if (pendingNavigation === lastProcessed) {
        console.count('same');
        return;
      }

      lastProcessed = pendingNavigation;

      if (pendingNavigation.preserve) {
        setTimeout(() => {
          browserHistory?.navigate(
            createTo(pendingNavigation.location, browserHistory),
            {
              replace: pendingNavigation.replaceHistory,
            },
          );
        }, 0);
      } else {
        let to = pendingNavigation.location.pathname || '';
        if (pendingNavigation.location.search) {
          to += '?' + pendingNavigation.location.search;
        }
        setTimeout(() => {
          browserHistory?.navigate(to, {
            replace: pendingNavigation.replaceHistory,
          });
        }, 0);
      }
    },
  };
};

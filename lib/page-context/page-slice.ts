import { Slice } from '@bangle.io/create-store';
import type { BangleStateOpts } from '@bangle.io/shared-types';

import {
  LifeCycle,
  PageSliceAction,
  pageSliceKey,
  PageSliceStateType,
} from './common';
import {
  blockReloadEffect,
  watchHistoryEffect,
  watchPageLifeCycleEffect,
} from './effects';

export const pageSliceInitialState: PageSliceStateType = {
  blockReload: false,
  location: {
    pathname: undefined,
    search: undefined,
  },
  history: undefined,
  historyChangedCounter: 0,
  lifeCycleState: {
    current: undefined,
    previous: undefined,
  },
};

// Monitors the page's lifecycle and navigation
// See https://developers.google.com/web/updates/2018/07/page-lifecycle-api
export function pageSlice(): Slice<PageSliceStateType, PageSliceAction> {
  return new Slice({
    key: pageSliceKey,
    state: {
      init: (opts: BangleStateOpts) => {
        if (!opts.lifecycle) {
          throw new Error('PageSlice expects page lifecycle in opts');
        }

        return {
          ...pageSliceInitialState,
          [LifeCycle]: opts.lifecycle,
          lifeCycleState: { current: opts.lifecycle.state },
        };
      },
      apply: (action, state) => {
        switch (action.name) {
          case 'action::page-slice:UPDATE_PAGE_LIFE_CYCLE_STATE': {
            return {
              ...state,
              lifeCycleState: action.value,
            };
          }
          case 'action::page-slice:BLOCK_RELOAD': {
            return {
              ...state,
              blockReload: action.value.block,
            };
          }

          case 'action::page-slice:history-set-history': {
            const history = action.value.history;

            return {
              ...state,
              history: action.value.history,
              location: {
                pathname: history.pathname,
                search: history.search,
              },
            };
          }
          case 'action::page-slice:history-update-location': {
            return {
              ...state,
              location: action.value.location,
            };
          }

          default: {
            return state;
          }
        }
      },
    },

    sideEffect: [
      watchPageLifeCycleEffect,
      blockReloadEffect,
      watchHistoryEffect,
    ],
  });
}

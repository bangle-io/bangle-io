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
              blockReload: action.value,
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

          // TODO move to op
          case 'action::page-slice:history-auth-error': {
            const { wsName } = action.value;
            if (
              !state.location.pathname?.startsWith(
                '/ws-nativefs-auth/' + wsName,
              )
            ) {
              let { history } = state;
              history?.navigate('/ws-nativefs-auth/' + wsName, {
                replace: true,
              });

              return {
                ...state,
              };
            }

            return state;
          }

          // TODO move to op
          case 'action::page-slice:history-ws-not-found': {
            if (!state.history) {
              return state;
            }

            if (
              !state.history.pathname?.startsWith(
                '/ws-not-found/' + action.value.wsName,
              )
            ) {
              // TODO check if wsName is current
              state.history.navigate('/ws-not-found/' + action.value.wsName);

              return {
                ...state,
              };
            }

            return state;
          }

          // TODO move to op
          case 'action::page-slice:history-on-invalid-path': {
            if (!state.history) {
              return state;
            }
            const { invalidPath, wsName } = action.value;
            if (
              !state.history.pathname?.startsWith('/ws-invalid-path/' + wsName)
            ) {
              state.history.navigate('/ws-invalid-path/' + wsName);
              return {
                ...state,
              };
            }

            return state;
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

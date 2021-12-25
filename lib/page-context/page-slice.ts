import { Slice } from '@bangle.io/create-store';
import type { BangleStateOpts } from '@bangle.io/shared-types';
import { OpenedWsPaths } from '@bangle.io/ws-path';

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
import { HistoryState } from './history';

export const pageSliceInitialState: PageSliceStateType = {
  blockReload: false,
  location: {
    pathname: undefined,
    search: undefined,
  },
  history: new HistoryState({}),
  historyChangedCounter: 0,
  lifeCycleState: {
    current: undefined,
    previous: undefined,
  },
};

function calculateLocation(
  currentLocation: PageSliceStateType['location'],
  history: HistoryState,
): PageSliceStateType['location'] {
  if (
    currentLocation.pathname === history.pathname &&
    currentLocation.search === history.search
  ) {
    return currentLocation;
  }
  return {
    pathname: history.pathname,
    search: history.search,
  };
}

// Monitors the page's lifecycle
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

          case 'action::page-slice:history-changed': {
            return {
              ...state,
              location: calculateLocation(state.location, state.history),
              historyChangedCounter: state.historyChangedCounter + 1,
            };
          }

          case 'action::page-slice:history-set-history': {
            const history = state.history.updateState({
              history: action.value.history,
            });

            return {
              ...state,
              history,
              historyChangedCounter: state.historyChangedCounter + 1,
              location: calculateLocation(state.location, history),
            };
          }

          case 'action::page-slice:history-auth-error': {
            const { wsName } = action.value;
            // TODO check if wsName is current
            if (
              !state.history.pathname?.startsWith('/ws-nativefs-auth/' + wsName)
            ) {
              let { history } = state;
              history = history.push({
                pathname: '/ws-nativefs-auth/' + wsName,
                state: {
                  previousLocation: history.location,
                },
              });
              return {
                ...state,
                history,
              };
            }

            return state;
          }

          case 'action::page-slice:history-ws-not-found': {
            if (
              !state.history.pathname?.startsWith(
                '/ws-not-found/' + action.value.wsName,
              )
            ) {
              // TODO check if wsName is current
              const history = state.history.replace({
                pathname: '/ws-not-found/' + action.value.wsName,
                state: {},
              });

              return {
                ...state,
                history,
              };
            }

            return state;
          }

          case 'action::page-slice:history-on-invalid-path': {
            const { invalidPath, wsName } = action.value;

            if (
              !state.history.pathname?.startsWith('/ws-invalid-path/' + wsName)
            ) {
              const history = state.history.replace({
                pathname: '/ws-invalid-path/' + wsName,
              });

              return {
                ...state,
                history,
              };
            }

            return state;
          }

          case 'action::page-slice:history-go-to-path': {
            const history = state.history.push({
              pathname: action.value.pathname,
            });

            return {
              ...state,
              history,
            };
          }

          case 'action::page-slice:history-update-opened-ws-paths': {
            if (!state.history?.location) {
              return state;
            }
            const { openedWsPathsArray, wsName, replace } = action.value;

            const openedWsPaths =
              OpenedWsPaths.createFromArray(openedWsPathsArray);

            const newLocation = openedWsPaths.getLocation(
              state.history?.location,
              wsName,
            );

            const history = replace
              ? state.history.replace(newLocation)
              : state.history.push(newLocation);

            return {
              ...state,
              history,
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

import { Slice } from '@bangle.io/create-store';
import { assertActionName } from '@bangle.io/utils';

import type {
  ExtractPageSliceAction,
  PageSliceAction,
  PageSliceStateType,
} from './common';
import { pageSliceKey } from './common';

export const pageSliceInitialState: PageSliceStateType = {
  blockReload: false,
  pendingNavigation: undefined,
  location: {
    pathname: undefined,
    search: undefined,
  },
  lifeCycleState: {
    current: undefined,
    previous: undefined,
  },
};

// Monitors the page's lifecycle and navigation
// See https://developers.google.com/web/updates/2018/07/page-lifecycle-api
export function pageSlice(): Slice<PageSliceStateType, PageSliceAction> {
  assertActionName('@bangle.io/slice-page', pageSliceKey);

  return new Slice({
    key: pageSliceKey,
    state: {
      init: () => {
        return {
          ...pageSliceInitialState,
        };
      },
      apply: (action, state) => {
        switch (action.name) {
          case 'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE': {
            return {
              ...state,
              lifeCycleState: action.value,
            };
          }
          case 'action::@bangle.io/slice-page:BLOCK_RELOAD': {
            return {
              ...state,
              blockReload: action.value.block,
            };
          }

          case 'action::@bangle.io/slice-page:history-update-location': {
            return {
              ...state,
              location: action.value.location,
            };
          }

          case 'action::@bangle.io/slice-page:history-update-pending-navigation': {
            return {
              ...state,
              pendingNavigation: action.value.pendingNavigation,
            };
          }

          default: {
            return state;
          }
        }
      },
    },
    actions: {
      'action::@bangle.io/slice-page:BLOCK_RELOAD': (actionName) => {
        return pageSliceKey.actionSerializer(
          actionName,
          (action) => {
            return action.value;
          },
          (obj) => {
            return obj;
          },
        );
      },

      'action::@bangle.io/slice-page:UPDATE_PAGE_LIFE_CYCLE_STATE': (
        actionName,
      ) => {
        return pageSliceKey.actionSerializer(
          actionName,
          (action) => {
            return action.value;
          },
          (obj) => {
            return obj;
          },
        );
      },

      'action::@bangle.io/slice-page:history-update-location': (actionName) => {
        return pageSliceKey.actionSerializer(
          actionName,
          (action) => {
            return {
              location: {
                pathname: action.value.location.pathname ?? null,
                search: action.value.location.search ?? null,
              },
            };
          },
          (obj) => {
            return {
              location: {
                pathname: obj.location.pathname ?? undefined,
                search: obj.location.search ?? undefined,
              },
            };
          },
        );
      },

      'action::@bangle.io/slice-page:history-update-pending-navigation': (
        actionName,
      ) => {
        return pageSliceKey.actionSerializer(
          actionName,
          (action) => {
            const { pendingNavigation } = action.value;

            if (!pendingNavigation) {
              return { pendingNavigation: null };
            }

            return {
              pendingNavigation: {
                location: {
                  pathname: pendingNavigation.location.pathname ?? null,
                  search: pendingNavigation.location.search ?? null,
                },
                replaceHistory: pendingNavigation.replaceHistory ?? null,
                preserve: pendingNavigation.preserve ?? null,
              },
            };
          },
          (obj) => {
            let { pendingNavigation } = obj;

            if (
              pendingNavigation == null ||
              pendingNavigation.location == null
            ) {
              return { pendingNavigation: undefined };
            }

            return {
              pendingNavigation: {
                location: {
                  pathname: pendingNavigation.location.pathname ?? undefined,
                  search: pendingNavigation.location.search ?? undefined,
                },
                replaceHistory: pendingNavigation.replaceHistory ?? undefined,
                preserve: pendingNavigation.preserve ?? undefined,
              },
            };
          },
        );
      },
    },

    sideEffect: [],
  });
}

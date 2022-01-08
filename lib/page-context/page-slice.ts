import { Slice } from '@bangle.io/create-store';
import type { BangleStateOpts } from '@bangle.io/shared-types';
import { assertActionType } from '@bangle.io/utils';

import {
  ExtractPageSliceAction,
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
  assertActionType('@bangle.io/page-context', {} as PageSliceAction);

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
          case 'action::@bangle.io/page-context:UPDATE_PAGE_LIFE_CYCLE_STATE': {
            return {
              ...state,
              lifeCycleState: action.value,
            };
          }
          case 'action::@bangle.io/page-context:BLOCK_RELOAD': {
            return {
              ...state,
              blockReload: action.value.block,
            };
          }

          case 'action::@bangle.io/page-context:history-set-history': {
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
          case 'action::@bangle.io/page-context:history-update-location': {
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
    actions: {
      'action::@bangle.io/page-context:BLOCK_RELOAD': (actionName) => {
        const toJSON = (action: ExtractPageSliceAction<typeof actionName>) => {
          return action.value;
        };
        const fromJSON = (obj: ReturnType<typeof toJSON>) => {
          return obj;
        };

        return {
          toJSON,
          fromJSON,
        };
      },

      'action::@bangle.io/page-context:UPDATE_PAGE_LIFE_CYCLE_STATE': (
        actionName,
      ) => {
        const toJSON = (action: ExtractPageSliceAction<typeof actionName>) => {
          return action.value;
        };
        const fromJSON = (obj: ReturnType<typeof toJSON>) => {
          return obj;
        };

        return {
          toJSON,
          fromJSON,
        };
      },

      'action::@bangle.io/page-context:history-set-history': (actionName) => {
        const toJSON = (action: ExtractPageSliceAction<typeof actionName>) => {
          return false as const;
        };
        const fromJSON = (obj: ReturnType<typeof toJSON>) => {
          return false as const;
        };

        return {
          toJSON,
          fromJSON,
        };
      },

      'action::@bangle.io/page-context:history-update-location': (
        actionName,
      ) => {
        const toJSON = (action: ExtractPageSliceAction<typeof actionName>) => {
          return {
            location: {
              pathname: action.value.location.pathname ?? null,
              search: action.value.location.search ?? null,
            },
          };
        };
        const fromJSON = (obj: ReturnType<typeof toJSON>) => {
          return {
            location: {
              pathname: obj.location.pathname ?? undefined,
              search: obj.location.search ?? undefined,
            },
          };
        };

        return {
          toJSON,
          fromJSON,
        };
      },
    },

    sideEffect: [
      watchPageLifeCycleEffect,
      blockReloadEffect,
      watchHistoryEffect,
    ],
  });
}

import { AppState, Slice, SliceSideEffect } from '@bangle.io/create-store';
import type { BangleStateOpts } from '@bangle.io/shared-types';

import {
  PAGE_BLOCK_RELOAD_ACTION_NAME,
  PageLifeCycleStates,
  PageSliceAction,
  pageSliceKey,
  PageSliceStateType,
} from './common';

const pendingSymbol = Symbol('pending-tasks');
const LifeCycle = Symbol('lifecycle');

export const pageSliceInitialState: PageSliceStateType = {
  blockReload: false,
  lifeCycleState: {
    current: undefined,
    previous: undefined,
  },
};

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
          case 'PAGE/UPDATE_PAGE_LIFE_CYCLE_STATE': {
            return {
              ...state,
              lifeCycleState: action.value,
            };
          }
          case PAGE_BLOCK_RELOAD_ACTION_NAME: {
            return {
              ...state,
              blockReload: action.value,
            };
          }
          default: {
            return state;
          }
        }
      },
    },

    sideEffect: [
      (store) => {
        const handler = (event) => {
          store.dispatch({
            name: 'PAGE/UPDATE_PAGE_LIFE_CYCLE_STATE',
            value: {
              current: event.newState,
              previous: event.oldState,
            },
          });
        };

        getPageLifeCycleObject(store.state)?.addEventListener(
          'statechange',
          handler,
        );
        return {
          destroy() {
            getPageLifeCycleObject(store.state)?.removeEventListener(
              'statechange',
              handler,
            );
          },
        };
      },

      blockReloadSideEffect,
    ],
  });
}

const blockReloadSideEffect: SliceSideEffect<
  PageSliceStateType,
  PageSliceAction
> = () => {
  return {
    update(store, __, pageState, prevPageState) {
      if (pageState === prevPageState) {
        return;
      }
      const blockReload = pageState?.blockReload;
      const prevBlockReload = prevPageState?.blockReload;

      if (blockReload && !prevBlockReload) {
        getPageLifeCycleObject(store.state)?.addUnsavedChanges(pendingSymbol);
      }

      if (!blockReload && prevBlockReload) {
        getPageLifeCycleObject(store.state)?.removeUnsavedChanges(
          pendingSymbol,
        );
      }
    },
  };
};

function getPageLifeCycleObject(state: AppState):
  | {
      addUnsavedChanges: (s: Symbol) => void;
      removeUnsavedChanges: (s: Symbol) => void;
      addEventListener: (type: string, cb: (event: any) => void) => void;
      removeEventListener: (type: string, cb: (event: any) => void) => void;
    }
  | undefined {
  return pageSliceKey.getSliceState(state)?.[LifeCycle];
}

export function getCurrentPageLifeCycle() {
  return (state: AppState) => {
    return pageSliceKey.getSliceState(state)?.lifeCycleState?.current;
  };
}

// Returns true when the lifecycle changes to the one in param
// use prevState to determine the transition to
export function pageLifeCycleTransitionedTo(
  lifeCycle: PageLifeCycleStates | PageLifeCycleStates[],
  prevState: AppState,
) {
  return (state: AppState): boolean => {
    const current = getCurrentPageLifeCycle()(state);
    const prev = getCurrentPageLifeCycle()(prevState);

    if (current === prev) {
      return false;
    }

    if (!current) {
      return false;
    }

    if (Array.isArray(lifeCycle)) {
      return lifeCycle.includes(current);
    }

    return current === lifeCycle;
  };
}

export function isPageLifeCycleOneOf(lifeCycles: PageLifeCycleStates[]) {
  return (state: AppState) => {
    const lf = getCurrentPageLifeCycle()(state);

    return lf ? lifeCycles.includes(lf) : false;
  };
}

import lifecycle from 'page-lifecycle';

import {
  PAGE_BLOCK_RELOAD_ACTION_NAME,
  PageSliceAction,
  pageSliceKey,
  PageSliceStateType,
} from '@bangle.io/constants';
import { Slice, SliceSideEffect } from '@bangle.io/create-store';

const pendingSymbol = Symbol('pending-tasks');

export const pageSliceInitialState: PageSliceStateType = {
  blockReload: false,
  lifeCycleState: {
    current: lifecycle.state,
    previous: undefined,
  },
};

export function pageSlice<T = any>(): Slice<
  PageSliceStateType,
  PageSliceAction,
  T
> {
  return new Slice({
    key: pageSliceKey,
    state: {
      init: () => {
        return {
          ...pageSliceInitialState,
          lifeCycleState: { current: lifecycle.state },
        };
      },
      apply: (action, state) => {
        switch (action.type) {
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
            type: 'PAGE/UPDATE_PAGE_LIFE_CYCLE_STATE',
            value: {
              current: event.newState,
              previous: event.oldState,
            },
          });
        };
        lifecycle?.addEventListener('statechange', handler);
        return {
          destroy() {
            lifecycle?.removeEventListener('statechange', handler);
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
    update(_, __, pageState, prevPageState) {
      if (pageState === prevPageState) {
        return;
      }
      const blockReload = pageState?.blockReload;
      const prevBlockReload = prevPageState?.blockReload;

      if (blockReload && !prevBlockReload) {
        lifecycle.addUnsavedChanges(pendingSymbol);
      }
      if (!blockReload && prevBlockReload) {
        lifecycle.removeUnsavedChanges(pendingSymbol);
      }
    },
  };
};

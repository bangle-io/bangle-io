import { SliceSideEffect } from '@bangle.io/create-store';

import type { PageSliceAction, PageSliceStateType } from './common';
import { getPageLifeCycleObject } from './common';

const pendingSymbol = Symbol('pending');

export const blockReloadEffect: SliceSideEffect<
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

export const watchPageLifeCycleEffect: SliceSideEffect<
  PageSliceStateType,
  PageSliceAction
> = (store) => {
  const handler = (event) => {
    store.dispatch({
      name: 'action::page-slice:UPDATE_PAGE_LIFE_CYCLE_STATE',
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

export const watchHistoryEffect: SliceSideEffect<
  PageSliceStateType,
  PageSliceAction
> = () => {
  // TODO there is a possibility that we miss a location
  // update before this is initialized
  let unlisten: (() => void) | undefined;

  return {
    destroy() {
      unlisten?.();
    },
    update(store, __, sliceState, prevSliceState) {
      const history = sliceState.history.history;
      if (history && history !== prevSliceState.history.history) {
        unlisten = history.listen(() => {
          store.dispatch({
            name: 'action::page-slice:history-changed',
          });
        });
      }
    },
  };
};

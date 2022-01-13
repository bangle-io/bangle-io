import { Slice, SliceKey, SliceSideEffect } from '@bangle.io/create-store';
import { BaseHistory, BrowserHistory, createTo } from '@bangle.io/history';
import {
  pageSliceKey,
  PageSliceStateType,
  syncPageLocation,
} from '@bangle.io/slice-page';
import { assertActionType, assertNonWorkerGlobalScope } from '@bangle.io/utils';

assertNonWorkerGlobalScope();

export const historySliceKey = new SliceKey<
  HistoryStateType,
  HistorySliceAction
>('history-slice');

export interface HistoryStateType {
  history: BaseHistory | undefined;
}

export const historyInitialState: HistoryStateType = {
  history: undefined,
};

type HistorySliceAction = {
  name: 'action::@bangle.io/bangle-store:history-slice-set-history';
  value: {
    history: BaseHistory;
  };
};

export function historySlice() {
  assertActionType('@bangle.io/bangle-store', {} as HistorySliceAction);

  return new Slice<HistoryStateType, HistorySliceAction>({
    key: historySliceKey,
    state: {
      init() {
        return {
          history: undefined,
        };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/bangle-store:history-slice-set-history': {
            return {
              ...state,
              history: action.value.history,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect: [watchHistoryEffect, applyPendingNavigation],
  });
}

// sets up history and watches for any changes in it
const applyPendingNavigation: SliceSideEffect<
  HistoryStateType,
  HistorySliceAction
> = (store) => {
  let lastProcessed: PageSliceStateType['pendingNavigation'];

  return {
    update(store) {
      const { pendingNavigation } = pageSliceKey.getSliceStateAsserted(
        store.state,
      );

      const { history } = historySliceKey.getSliceStateAsserted(store.state);

      if (!history || !pendingNavigation) {
        return;
      }

      if (pendingNavigation === lastProcessed) {
        return;
      }

      lastProcessed = pendingNavigation;
      if (pendingNavigation.preserve) {
        setTimeout(() => {
          history?.navigate(createTo(pendingNavigation.location, history), {
            replace: pendingNavigation.replaceHistory,
          });
        }, 0);
      } else {
        let to = pendingNavigation.location.pathname || '';
        if (pendingNavigation.location.search) {
          to += '?' + pendingNavigation.location.search;
        }
        setTimeout(() => {
          history?.navigate(to, {
            replace: pendingNavigation.replaceHistory,
          });
        }, 0);
      }
    },
  };
};

// sets up history and watches for any changes in it
const watchHistoryEffect: SliceSideEffect<
  HistoryStateType,
  HistorySliceAction
> = (store) => {
  const browserHistory = new BrowserHistory('', (location) => {
    syncPageLocation(location)(
      store.state,
      pageSliceKey.getDispatch(store.dispatch),
    );
  });

  store.dispatch({
    name: 'action::@bangle.io/bangle-store:history-slice-set-history',
    value: { history: browserHistory },
  });

  syncPageLocation({
    search: browserHistory.search,
    pathname: browserHistory.pathname,
  })(store.state, pageSliceKey.getDispatch(store.dispatch));

  return {
    destroy() {
      browserHistory.destroy();
    },
  };
};

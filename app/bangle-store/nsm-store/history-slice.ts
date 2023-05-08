import type { BaseHistory } from '@bangle.io/history';
import { BrowserHistory, createTo } from '@bangle.io/history';
import { changeEffect, createSliceV2, syncChangeEffect } from '@bangle.io/nsm';
import { nsmPageSlice, syncPageLocation } from '@bangle.io/slice-page';

export interface HistoryStateType {
  history: BaseHistory | undefined;
}

const historyInitState: HistoryStateType = {
  history: undefined,
};

const historySlice = createSliceV2([], {
  name: 'history-slice',
  initState: historyInitState,
});

const setHistory = historySlice.createAction(
  'setHistory',
  (history: HistoryStateType['history']) => {
    return (state) => ({
      ...state,
      history,
    });
  },
);

const pendingNavEffect = syncChangeEffect(
  'pendingNavEffect',
  {
    pendingNavigation: nsmPageSlice.pick((s) => s.pendingNavigation),
    history: historySlice.pick((s) => s.history),
  },
  ({ history, pendingNavigation }) => {
    if (!history || !pendingNavigation) {
      return;
    }

    if (pendingNavigation.preserve) {
      history.navigate(createTo(pendingNavigation.location, history), {
        replace: pendingNavigation.replaceHistory,
      });
    } else {
      let to = pendingNavigation.location.pathname || '';

      if (pendingNavigation.location.search) {
        to += '?' + pendingNavigation.location.search;
      }
      history.navigate(to, {
        replace: pendingNavigation.replaceHistory,
      });
    }
  },
);

const watchHistoryEffect = changeEffect(
  'watchHistoryEffect',
  {
    history: historySlice.passivePick((s) => s.history),
    pageSlice: nsmPageSlice.passivePick((s) => s),
  },
  (_, dispatch) => {
    const browserHistory = new BrowserHistory('', (location) => {
      dispatch(syncPageLocation(location));
    });

    dispatch(setHistory(browserHistory));

    dispatch(
      syncPageLocation({
        search: browserHistory.search,
        pathname: browserHistory.pathname,
      }),
    );

    return () => {
      browserHistory.destroy();
    };
  },
);

export const historySliceFamily = [
  historySlice,
  pendingNavEffect,
  watchHistoryEffect,
];

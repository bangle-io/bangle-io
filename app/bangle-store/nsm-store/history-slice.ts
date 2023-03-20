import type { BaseHistory } from '@bangle.io/history';
import { BrowserHistory, createTo } from '@bangle.io/history';
import { changeEffect, createSlice, syncChangeEffect } from '@bangle.io/nsm';
import { nsmPageSlice } from '@bangle.io/slice-page';

export interface HistoryStateType {
  history: BaseHistory | undefined;
}

const historyInitState: HistoryStateType = {
  history: undefined,
};

const historySlice = createSlice([], {
  name: 'history-slice',
  initState: historyInitState,
  actions: {
    setHistory: (history: HistoryStateType['history']) => (state) => ({
      ...state,
      history,
    }),
  },
  selectors: {},
});

const pendingNavEffect = syncChangeEffect(
  'pendingNavEffect',
  {
    pendingNavigation: nsmPageSlice.passivePick((s) => s.pendingNavigation),
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
      dispatch(nsmPageSlice.actions.syncPageLocation(location));
    });

    dispatch(historySlice.actions.setHistory(browserHistory));

    dispatch(
      nsmPageSlice.actions.syncPageLocation({
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

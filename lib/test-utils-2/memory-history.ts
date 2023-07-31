import type { BaseHistory } from '@bangle.io/history';
import { createTo, MemoryHistory } from '@bangle.io/history';
import { cleanup, effect, slice } from '@bangle.io/nsm-3';
import { nsmPageSlice, syncPageLocation } from '@bangle.io/slice-page';

const initState: { history: BaseHistory | undefined } = {
  history: undefined,
};

export const memoryHistorySlice = slice([], {
  name: 'test-memory-history-slice',
  state: initState,
});

const updateHistoryAct = memoryHistorySlice.simpleAction('history');

const historyEffectSetup = effect(
  (store) => {
    const history = new MemoryHistory('', (location) => {
      store.dispatch(syncPageLocation(location));
    });

    store.dispatch(updateHistoryAct(history));
    store.dispatch(
      syncPageLocation({
        search: history.search,
        pathname: history.pathname,
      }),
    );

    cleanup(store, () => {
      history.destroy();
    });
  },
  {
    deferred: false,
  },
);

const historyEffectSync = effect(
  (store) => {
    const { pendingNavigation } = nsmPageSlice.track(store);

    const { history } = memoryHistorySlice.get(store.state);

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
  {
    deferred: false,
  },
);

export const memoryHistoryEffects = [historyEffectSetup, historyEffectSync];

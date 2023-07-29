import { WorkspaceType } from '@bangle.io/constants';
import type { BaseHistory } from '@bangle.io/history';
import { BrowserHistory, createTo } from '@bangle.io/history';
import { cleanup, effect, slice } from '@bangle.io/nsm-3';
import { nsmPageSlice, syncPageLocation } from '@bangle.io/slice-page';
import { readWorkspaceInfo } from '@bangle.io/workspace-info';

export interface HistoryStateType {
  history: BaseHistory | undefined;
}

const historyInitState: HistoryStateType = {
  history: undefined,
};

export const historySlice = slice([], {
  name: 'history-slice',
  state: historyInitState,
});

const setHistory = historySlice.simpleAction('history');

const pendingNavEffect = effect(
  function pendingNavEffect(store) {
    const { pendingNavigation } = nsmPageSlice.track(store);
    const { history } = historySlice.track(store);

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

const watchHistoryEffect = effect(function watchHistoryEffect(store) {
  const browserHistory = new BrowserHistory('', (location) => {
    store.dispatch(syncPageLocation(location));
  });

  store.dispatch(setHistory(browserHistory));

  store.dispatch(
    syncPageLocation({
      search: browserHistory.search,
      pathname: browserHistory.pathname,
    }),
  );

  cleanup(store, () => {
    browserHistory.destroy();
  });
});

const saveWorkspaceInfoEffect = effect(function saveWorkspaceInfoEffect(store) {
  const { wsName } = nsmPageSlice.track(store);
  const { history } = historySlice.get(store.state);

  let destroyed = false;

  if (wsName) {
    readWorkspaceInfo(wsName).then((info) => {
      if (!info || destroyed) {
        return;
      }
      if (!history || !(history instanceof BrowserHistory)) {
        return;
      }

      if (info.type === WorkspaceType.NativeFS) {
        history.updateHistoryState({
          workspaceRootDir: info.metadata.rootDirHandle,
        });
      } else {
        history.updateHistoryState({});
      }
    });
  }

  cleanup(store, () => {
    destroyed = true;
  });
});

export const historyEffects = [
  pendingNavEffect,
  watchHistoryEffect,
  saveWorkspaceInfoEffect,
];

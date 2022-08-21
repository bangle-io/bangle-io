import { WorkspaceTypeNative } from '@bangle.io/constants';
import { Slice, SliceKey } from '@bangle.io/create-store';
import type { BaseHistory } from '@bangle.io/history';
import { BrowserHistory, createTo } from '@bangle.io/history';
import type { PageSliceStateType } from '@bangle.io/slice-page';
import { pageSliceKey, syncPageLocation } from '@bangle.io/slice-page';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';
import { assertActionName, assertNonWorkerGlobalScope } from '@bangle.io/utils';

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
  assertActionName('@bangle.io/bangle-store', historySliceKey);

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
    sideEffect: [
      watchHistoryEffect,
      applyPendingNavigation,
      saveWorkspaceInfoEffect,
    ],
  });
}

// sets up history and watches for any changes in it
const applyPendingNavigation = historySliceKey.effect(() => {
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
  };
});

// sets up history and watches for any changes in it
const watchHistoryEffect = historySliceKey.effect(() => {
  return {
    deferredOnce(store, abortSignal) {
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

      abortSignal.addEventListener(
        'abort',
        () => {
          browserHistory.destroy();
        },
        { once: true },
      );
    },
  };
});

// Persist rootDirectory handle in the browser history to
// prevent release of the authorized native browser FS permission on reload
export const saveWorkspaceInfoEffect = historySliceKey.effect(() => {
  let lastSavedWsName: string | undefined = undefined;

  return {
    deferredUpdate(store) {
      const { cachedWorkspaceInfo } = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      );

      if (cachedWorkspaceInfo && cachedWorkspaceInfo.name !== lastSavedWsName) {
        const { history } = historySliceKey.getSliceStateAsserted(store.state);

        if (!history || !(history instanceof BrowserHistory)) {
          return;
        }

        if (cachedWorkspaceInfo.type === WorkspaceTypeNative) {
          history.updateHistoryState({
            workspaceRootDir: cachedWorkspaceInfo.metadata.rootDirHandle,
          });
        } else {
          history.updateHistoryState({});
        }
        lastSavedWsName = cachedWorkspaceInfo.name;
      }
    },
  };
});

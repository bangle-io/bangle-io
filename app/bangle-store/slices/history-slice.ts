import { Slice, SliceKey, SliceSideEffect } from '@bangle.io/create-store';
import { BaseHistory, BrowserHistory, createTo } from '@bangle.io/history';
import {
  pageSliceKey,
  PageSliceStateType,
  syncPageLocation,
} from '@bangle.io/slice-page';
import {
  workspacesSliceKey,
  WorkspacesSliceState,
  WorkspaceType,
} from '@bangle.io/slice-workspaces-manager';
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
const applyPendingNavigation: SliceSideEffect<
  HistoryStateType,
  HistorySliceAction
> = () => {
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
        history?.navigate(createTo(pendingNavigation.location, history), {
          replace: pendingNavigation.replaceHistory,
        });
      } else {
        let to = pendingNavigation.location.pathname || '';
        if (pendingNavigation.location.search) {
          to += '?' + pendingNavigation.location.search;
        }
        history?.navigate(to, {
          replace: pendingNavigation.replaceHistory,
        });
      }
    },
  };
};

// sets up history and watches for any changes in it
const watchHistoryEffect: SliceSideEffect<
  HistoryStateType,
  HistorySliceAction
> = () => {
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

      abortSignal.addEventListener('abort', () => {
        browserHistory.destroy();
      });
    },
  };
};

// Persist rootDirectory handle in the browser history to
// prevent release of the authorized native browser FS permission on reload
export const saveWorkspaceInfoEffect: SliceSideEffect<
  HistoryStateType,
  HistorySliceAction
> = () => {
  let lastWorkspaceInfos: WorkspacesSliceState['workspaceInfos'] | undefined =
    undefined;

  return {
    deferredUpdate(store) {
      const { workspaceInfos } = workspacesSliceKey.getSliceStateAsserted(
        store.state,
      );

      if (workspaceInfos && lastWorkspaceInfos !== workspaceInfos) {
        const { history } = historySliceKey.getSliceStateAsserted(store.state);

        if (!history || !(history instanceof BrowserHistory)) {
          return;
        }

        const result = Object.values(workspaceInfos)
          .filter((r) => !r.deleted)
          .map((r) => {
            if (r.type === WorkspaceType['nativefs']) {
              return r?.metadata?.rootDirHandle;
            }
            return undefined;
          })
          .filter((r) => r);
        history.updateHistoryState({
          workspacesRootDir: result,
        });

        lastWorkspaceInfos = workspaceInfos;
      }
    },
  };
};

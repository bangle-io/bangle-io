import { ApplicationStore } from '@bangle.io/create-store';
import { getPageLocation, saveToHistoryState } from '@bangle.io/page-context';
import { getWorkspaceInfo } from '@bangle.io/workspaces';

import { SideEffect, workspaceSliceKey } from './common';
import { findInvalidLocation } from './helpers';
import { saveLastWorkspaceUsed } from './last-seen-ws-name';
import {
  historyOnInvalidPath,
  refreshWsPaths,
  updateLocation,
} from './operations';

export const refreshWsPathsEffect: SideEffect = () => {
  let loadWsPathsOnMount = true;

  return {
    deferredUpdate(store) {
      const sliceState = workspaceSliceKey.getSliceState(store.state);

      if (loadWsPathsOnMount && sliceState && sliceState.wsPaths == null) {
        loadWsPathsOnMount = false;
        refreshWsPaths()(store.state, store.dispatch);
      }
    },
    update(store, _, sliceState, prevSliceState) {
      // update wsPaths on workspace change
      if (sliceState.wsName && sliceState.wsName !== prevSliceState.wsName) {
        refreshWsPaths()(store.state, store.dispatch);
      }
    },
  };
};

// an effect to see if the location has some invalid wsPath
// if it does, dispatch an action.
export const validateLocationEffect: SideEffect = (store) => {
  const initialState = workspaceSliceKey.getSliceState(store.state);

  if (initialState?.wsName) {
    const { locationPathname, locationSearchQuery, wsName } = initialState;
    const invalid = findInvalidLocation(locationPathname, locationSearchQuery);
    if (invalid) {
      historyOnInvalidPath(wsName, invalid)(store.state, store.dispatch);
    }
  }

  return {
    update(store, __, sliceState, prevSliceState): void {
      const { wsName, locationPathname, locationSearchQuery } = sliceState;

      if (!wsName) {
        return;
      }

      if (
        locationPathname !== prevSliceState.locationPathname ||
        locationSearchQuery !== prevSliceState.locationSearchQuery
      ) {
        const invalid = findInvalidLocation(
          locationPathname,
          locationSearchQuery,
        );

        if (invalid) {
          historyOnInvalidPath(wsName, invalid)(store.state, store.dispatch);
        }
      }
    },
  };
};

// This keeps a copy of location changes within the workspace slice
// to derive fields like wsName.
export const updateLocationEffect: SideEffect = () => {
  return {
    update(store, prevState) {
      const location = getPageLocation()(store.state);
      if (location !== getPageLocation()(prevState)) {
        updateLocation({
          search: location?.search,
          pathname: location?.pathname,
        })(store.state, store.dispatch);
      }
    },
  };
};

// Persist workspaceInfo in the history to
// prevents release of the native browser FS permission
export const saveWorkspaceInfoEffect: SideEffect = () => {
  let destroyed = false;
  let pendingReqFor: string | undefined;

  return {
    destroy() {
      destroyed = true;
    },

    update(store, __, sliceState, prevSliceState) {
      if (sliceState.wsName && sliceState.wsName !== prevSliceState.wsName) {
        if (pendingReqFor === sliceState.wsName) {
          return;
        }

        pendingReqFor = sliceState.wsName;

        getWorkspaceInfo(pendingReqFor).then(
          (_workspaceInfo) => {
            if (!destroyed && _workspaceInfo.name === pendingReqFor) {
              saveToHistoryState('workspaceInfo', _workspaceInfo)(
                store.state,
                store.dispatch as ApplicationStore['dispatch'],
              );
            }
          },
          (error) => {
            console.error(error);
            pendingReqFor = undefined;
          },
        );
      }
    },
  };
};

export const saveLastUsedWorkspace: SideEffect = () => {
  let lastSeenWsName: string | undefined;
  return {
    destroy() {},
    deferredUpdate(store) {
      const { wsName } = workspaceSliceKey.getSliceState(store.state) || {};
      if (wsName && wsName !== lastSeenWsName) {
        lastSeenWsName = wsName;
        saveLastWorkspaceUsed(wsName);
      }
    },
  };
};

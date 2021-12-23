import { SideEffect, workspaceSliceKey } from './common';
import { findInvalidLocation } from './helpers';
import { historyOnInvalidPath, refreshWsPaths } from './operations';

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

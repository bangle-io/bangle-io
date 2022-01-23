import { savePreviousValue } from '@bangle.io/create-store';
import type { ReturnReturnType } from '@bangle.io/shared-types';
import { getPageLocation } from '@bangle.io/slice-page';
import { shallowEqual } from '@bangle.io/utils';

import { SideEffect, workspaceSliceKey } from './common';
import { refreshWsPaths, syncPageLocation } from './operations';
import { saveWorkspacesInfo } from './workspaces/read-ws-info';
import { listWorkspaces } from './workspaces-operations';

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

// This keeps a copy of location changes within the workspace slice
// to derive fields like wsName.
export const updateLocationEffect: SideEffect = () => {
  const prevVal = savePreviousValue<ReturnReturnType<typeof getPageLocation>>();

  return {
    update(store, _) {
      const location = getPageLocation()(store.state);
      const prevLocation = prevVal(location);
      if (!location) {
        return;
      }

      if (prevLocation && shallowEqual(location, prevLocation)) {
        return;
      }

      syncPageLocation({
        search: location?.search,
        pathname: location?.pathname,
      })(store.state, store.dispatch);
    },
  };
};

export const refreshWorkspacesEffect = workspaceSliceKey.effect(() => {
  return {
    deferredOnce(store) {
      listWorkspaces()(store.state, store.dispatch, store);
    },
    update(store, __, sliceState, prevSliceState) {
      const { workspacesInfo } = sliceState;
      const { workspacesInfo: prevWorkspacesInfo } = prevSliceState;

      if (workspacesInfo && workspacesInfo !== prevWorkspacesInfo) {
        saveWorkspacesInfo(store.state);
      }
    },
  };
});

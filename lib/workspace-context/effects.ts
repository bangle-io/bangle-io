import { savePreviousValue } from '@bangle.io/create-store';
import { getPageLocation } from '@bangle.io/page-context';
import type { ReturnReturnType } from '@bangle.io/shared-types';
import { shallowEqual } from '@bangle.io/utils';

import { SideEffect, workspaceSliceKey } from './common';
import { saveLastWorkspaceUsed } from './last-seen-ws-name';
import { refreshWsPaths, syncPageLocation } from './operations';

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

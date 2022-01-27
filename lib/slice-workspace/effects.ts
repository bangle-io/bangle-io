import { savePreviousValue } from '@bangle.io/create-store';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import type { ReturnReturnType } from '@bangle.io/shared-types';
import { getPageLocation } from '@bangle.io/slice-page';
import { assertSignal, shallowEqual } from '@bangle.io/utils';
import {
  OpenedWsPaths,
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
} from '@bangle.io/ws-path';

import { SideEffect, workspaceSliceKey } from './common';
import { _getStorageProvider, getStorageProviderOpts } from './file-operations';
import { validateOpenedWsPaths } from './helpers';
import {
  goToInvalidPathRoute,
  goToWsNameRouteNotFoundRoute,
} from './operations';
import { WORKSPACE_NOT_FOUND_ERROR, WorkspaceError } from './workspaces/errors';
import { saveWorkspacesInfo } from './workspaces/read-ws-info';
import {
  getWorkspaceInfo,
  getWorkspaceInfoSync,
  listWorkspaces,
} from './workspaces-operations';

export const refreshWsPathsEffect: SideEffect = () => {
  let lastCounter: number | undefined;
  let lastWsName: string | undefined;
  return {
    async deferredUpdate(store, abortSignal) {
      const { refreshCounter, wsName } =
        workspaceSliceKey.getSliceStateAsserted(store.state);

      if (!wsName) {
        return;
      }

      if (wsName !== lastWsName || lastCounter !== refreshCounter) {
        const { state } = store;
        const wsInfo = await getWorkspaceInfoSync(wsName)(state);
        const { extensionRegistry } =
          extensionRegistrySliceKey.getSliceStateAsserted(state);

        const storageProvider = _getStorageProvider(wsInfo, extensionRegistry);

        if (!storageProvider) {
          return;
        }

        const items = await storageProvider.listAllFiles(
          abortSignal,
          wsName,
          getStorageProviderOpts()(store.state, store.dispatch),
        );
        lastWsName = wsName;
        lastCounter = refreshCounter;
        store.dispatch({
          name: 'action::@bangle.io/slice-workspace:update-ws-paths',
          value: {
            wsName,
            wsPaths: items,
          },
        });
      }
    },
  };
};

// This keeps a copy of location changes within the workspace slice
// to derive fields like wsName.
export const updateLocationEffect = workspaceSliceKey.effect(() => {
  const prevVal = savePreviousValue<ReturnReturnType<typeof getPageLocation>>();

  return {
    async deferredUpdate(store, abortSignal) {
      assertSignal(abortSignal);

      const location = getPageLocation()(store.state);
      const prevLocation = prevVal(location);

      if (!location) {
        return;
      }

      if (prevLocation && shallowEqual(location, prevLocation)) {
        return;
      }

      const currentWsName = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      ).wsName;

      const { pathname, search } = location;

      const wsName = pathnameToWsName(location.pathname);

      if (!wsName) {
        store.dispatch({
          name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
          value: {
            wsName: undefined,
            openedWsPaths: OpenedWsPaths.createEmpty(),
          },
        });
        return;
      }

      // Check if workspace has been created / switch to
      if (currentWsName !== wsName) {
        try {
          const wsInfo = await getWorkspaceInfo(wsName)(store.state);

          if (wsInfo.deleted) {
            goToWsNameRouteNotFoundRoute(wsName)(store.state, store.dispatch);
            return;
          }
        } catch (error) {
          assertSignal(abortSignal);
          if (
            error instanceof WorkspaceError &&
            error.code === WORKSPACE_NOT_FOUND_ERROR
          ) {
            goToWsNameRouteNotFoundRoute(wsName)(store.state, store.dispatch);
            return;
          }
          throw error;
        }
      }

      const openedWsPaths = OpenedWsPaths.createFromArray([
        pathnameToWsPath(pathname),
        searchToWsPath(search),
      ]);

      const validOpenedWsPaths = validateOpenedWsPaths(openedWsPaths);

      if (!validOpenedWsPaths.valid) {
        goToInvalidPathRoute(wsName, validOpenedWsPaths.invalidWsPath)(
          store.state,
          store.dispatch,
        );
        return;
      }

      store.dispatch({
        name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
        value: {
          wsName: wsName,
          openedWsPaths: openedWsPaths,
        },
      });
    },
  };
});

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

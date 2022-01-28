import { useReducer } from 'react';
import { createSelector } from 'reselect';

import { sleep } from '@bangle.dev/utils';

import { AppState, savePreviousValue } from '@bangle.io/create-store';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import { ReturnReturnType } from '@bangle.io/shared-types';
import { getPageLocation } from '@bangle.io/slice-page';
import { shallowEqual } from '@bangle.io/utils';
import {
  OpenedWsPaths,
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
} from '@bangle.io/ws-path';

import { WorkspaceSliceState } from '.';
import { SideEffect, workspaceSliceKey } from './common';
import {
  _getStorageProvider,
  getStorageErrorHandler,
  getStorageProviderOpts,
  workspaceErrorHandler,
} from './file-operations';
import { getWsInfoIfNotDeleted, validateOpenedWsPaths } from './helpers';
import {
  goToInvalidPathRoute,
  goToWorkspaceHomeRoute,
  goToWsNameRouteNotFoundRoute,
  sliceHasError,
} from './operations';
import { saveWorkspacesInfo } from './workspaces/read-ws-info';
import { listWorkspaces } from './workspaces-operations';

export const errorHandlerEffect: SideEffect = () => {
  return {
    async deferredUpdate(store, abortSignal) {
      const { error } = workspaceSliceKey.getSliceStateAsserted(store.state);

      if (!error) {
        return;
      }
      // give priority to workspace error handler
      if (workspaceErrorHandler(error, store) === true) {
        store.dispatch({
          name: 'action::@bangle.io/slice-workspace:set-error',
          value: {
            error: undefined,
          },
        });
        return;
      }

      const wsName = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      ).wsName;
      // Only handle errors of the current wsName
      // this avoids showing errors of previously opened workspace due to delay
      // in processing.
      if (wsName) {
        // let the storage provider handle error
        const errorHandler = getStorageErrorHandler()(
          store.state,
          store.dispatch,
        );
        if (errorHandler(error, store) === true) {
          store.dispatch({
            name: 'action::@bangle.io/slice-workspace:set-error',
            value: {
              error: undefined,
            },
          });
          return;
        }
      }
      // TODO make this error with a code so root can handle this
      throw new Error('Unable to handler error ' + error.message);
    },
  };
};

export const refreshWsPathsEffect: SideEffect = () => {
  let lastCounter: number | undefined;
  let lastWsName: string | undefined;

  return {
    async deferredUpdate(store, abortSignal) {
      if (sliceHasError()(store.state)) {
        console.log('returning early error');
        return;
      }

      const { refreshCounter, wsName, workspacesInfo } =
        workspaceSliceKey.getSliceStateAsserted(store.state);

      if (!wsName || !workspacesInfo) {
        console.log('returning early wsName || workspacesInfo');
        return;
      }

      if (wsName !== lastWsName || lastCounter !== refreshCounter) {
        const { state } = store;

        const wsInfo = getWsInfoIfNotDeleted(wsName, workspacesInfo);

        if (!wsInfo) {
          console.log('returning early wsInfo');
          return;
        }

        const { extensionRegistry } =
          extensionRegistrySliceKey.getSliceStateAsserted(state);

        const storageProvider = _getStorageProvider(wsInfo, extensionRegistry);

        if (!storageProvider) {
          console.log('returning early storageProvider');
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

// react to wsInfo deletion
export const wsDeleteEffect = workspaceSliceKey.effect(() => {
  return {
    update(store, prevState) {
      if (sliceHasError()(store.state)) {
        return;
      }

      const { wsName } = workspaceSliceKey.getSliceStateAsserted(store.state);

      const workspacesInfo = workspaceSliceKey.getValueIfChanged(
        'workspacesInfo',
        store.state,
        prevState,
      );

      if (wsName && workspacesInfo?.[wsName]?.deleted === true) {
        goToWorkspaceHomeRoute()(store.state, store.dispatch);
        return;
      }
    },
  };
});

// This keeps a copy of location changes within the workspace slice
// to derive fields like wsName.
export const updateLocationEffect = workspaceSliceKey.effect(() => {
  return {
    async deferredUpdate(store) {
      if (sliceHasError()(store.state)) {
        return;
      }

      const {
        wsName: currentWsName,
        workspacesInfo,
        openedWsPaths: currentOpenedWsPaths,
      } = workspaceSliceKey.getSliceStateAsserted(store.state);

      const location = getPageLocation()(store.state);
      const incomingWsName = pathnameToWsName(location?.pathname);

      if (!incomingWsName && currentWsName) {
        store.dispatch({
          name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
          value: {
            wsName: undefined,
            openedWsPaths: OpenedWsPaths.createEmpty(),
          },
        });
        return;
      }

      if (!workspacesInfo || !location || !incomingWsName) {
        return;
      }

      const { pathname, search } = location;

      const incomingOpenedWsPaths = OpenedWsPaths.createFromArray([
        pathnameToWsPath(pathname),
        searchToWsPath(search),
      ]);

      const wsInfo = getWsInfoIfNotDeleted(incomingWsName, workspacesInfo);

      if (!wsInfo) {
        goToWsNameRouteNotFoundRoute(incomingWsName)(
          store.state,
          store.dispatch,
        );
        return;
      }

      const validOpenedWsPaths = validateOpenedWsPaths(incomingOpenedWsPaths);

      if (!validOpenedWsPaths.valid) {
        goToInvalidPathRoute(incomingWsName, validOpenedWsPaths.invalidWsPath)(
          store.state,
          store.dispatch,
        );
        return;
      }

      if (
        incomingWsName !== currentWsName ||
        !incomingOpenedWsPaths.equal(currentOpenedWsPaths)
      ) {
        store.dispatch({
          name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
          value: {
            wsName: incomingWsName,
            openedWsPaths: incomingOpenedWsPaths,
          },
        });
      }
    },
  };
});

export const refreshWorkspacesEffect = workspaceSliceKey.effect(() => {
  return {
    deferredOnce(store) {
      listWorkspaces()(store.state, store.dispatch, store);
    },
    update(store, __, sliceState, prevSliceState) {
      if (sliceHasError()(store.state)) {
        return;
      }

      const { workspacesInfo } = sliceState;
      const { workspacesInfo: prevWorkspacesInfo } = prevSliceState;

      if (workspacesInfo && workspacesInfo !== prevWorkspacesInfo) {
        saveWorkspacesInfo(store.state);
      }
    },
  };
});

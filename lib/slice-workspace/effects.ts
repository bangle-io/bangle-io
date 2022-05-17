import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import {
  pageSliceKey,
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
} from '@bangle.io/slice-page';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { SideEffect, workspaceSliceKey } from './common';
import { WORKSPACE_NOT_FOUND_ERROR, WorkspaceError } from './errors';
import { getStorageProviderOpts } from './file-operations';
import {
  getWsInfoIfNotDeleted,
  storageProviderErrorHandlerFromExtensionRegistry,
  storageProviderFromExtensionRegistry,
  validateOpenedWsPaths,
} from './helpers';
import {
  goToInvalidPathRoute,
  goToWorkspaceHomeRoute,
  goToWsNameRouteNotFoundRoute,
  sliceHasError,
} from './operations';
import { saveWorkspacesInfo } from './read-ws-info';
import { storageProviderHelpers } from './storage-provider-helpers';
import { listWorkspaces } from './workspaces-operations';

const LOG = false;

const log = LOG
  ? console.debug.bind(console, 'slice-workspace effects')
  : () => {};

export const errorHandlerEffect: SideEffect = () => {
  let lastErrorSeen: Error | undefined;

  return {
    async deferredUpdate(store) {
      // TODO take to a better place
      const reset = (wsName = 'bangle-workspace-errored') => {
        goToWsNameRouteNotFoundRoute(wsName)(store.state, store.dispatch);
        store.dispatch({
          name: 'action::@bangle.io/slice-workspace:set-error',
          value: {
            error: undefined,
          },
        });
      };
      const { error } = workspaceSliceKey.getSliceStateAsserted(store.state);

      if (!error) {
        if (lastErrorSeen) {
          lastErrorSeen = undefined;
        }

        return;
      }

      if (error === lastErrorSeen) {
        return;
      }

      lastErrorSeen = error;

      // give priority to workspace error handler
      if (
        error instanceof WorkspaceError &&
        error.code === WORKSPACE_NOT_FOUND_ERROR
      ) {
        const wsName = workspaceSliceKey.getSliceStateAsserted(
          store.state,
        ).wsName;

        reset(wsName);

        return;
      }

      // let the storage provider handle error
      const wsName = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      ).wsName;
      const erroredStorageType =
        storageProviderHelpers.getStorageProviderNameFromError(error);

      // Only handle errors of the current wsName
      // this avoids showing errors of previously opened workspace due to delay
      // in processing.
      if (erroredStorageType) {
        if (!wsName) {
          reset(wsName);

          return;
        }

        const errorHandler = storageProviderErrorHandlerFromExtensionRegistry(
          erroredStorageType,
          extensionRegistrySliceKey.getSliceStateAsserted(store.state)
            .extensionRegistry,
        );

        if (errorHandler && errorHandler(error as any, store) === true) {
          store.dispatch({
            name: 'action::@bangle.io/slice-workspace:set-error',
            value: {
              error: undefined,
            },
          });

          return;
        }
        // if we reach here, we can't throw it back since its a storage error
        // and no other part of the application can take care of it.
        console.error(
          `Storage provider (${erroredStorageType}) didn't  handle error`,
          error,
        );

        return;
      }

      // TODO make this error with a code so root can handle this
      throw new Error('Unable to handler error ' + error.message);
    },
  };
};

export const refreshWsPathsEffect: SideEffect = () => {
  let abort = new AbortController();

  return {
    async deferredUpdate(store, prevState) {
      const [changed] = workspaceSliceKey.didChange(store.state, prevState)(
        'refreshCounter',
        'error',
        'wsName',
        'workspacesInfo',
      );

      if (!changed) {
        return;
      }

      const { error, wsName, workspacesInfo } =
        workspaceSliceKey.getSliceStateAsserted(store.state);

      if (error) {
        log('returning early error');

        return;
      }

      if (!wsName || !workspacesInfo) {
        log('returning early wsName || workspacesInfo');

        return;
      }

      const { state } = store;

      const wsInfo = getWsInfoIfNotDeleted(wsName, workspacesInfo);

      if (!wsInfo) {
        log('returning early wsInfo');

        return;
      }

      const { extensionRegistry } =
        extensionRegistrySliceKey.getSliceStateAsserted(state);

      const storageProvider = storageProviderFromExtensionRegistry(
        wsInfo.type,
        extensionRegistry,
      );

      if (!storageProvider) {
        log('returning early storageProvider');

        return;
      }

      abort.abort();
      abort = new AbortController();

      const items = await storageProvider.listAllFiles(
        abort.signal,
        wsName,
        getStorageProviderOpts()(store.state, store.dispatch),
      );

      store.dispatch({
        name: 'action::@bangle.io/slice-workspace:update-ws-paths',
        value: {
          wsName,
          wsPaths: items,
        },
      });
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
    deferredUpdate(store, prevState) {
      const [workspaceOrErrorChanged] = workspaceSliceKey.didChange(
        store.state,
        prevState,
      )('workspacesInfo', 'error');

      const [locationChanged] = pageSliceKey.didChange(
        store.state,
        prevState,
      )('location');

      if (!locationChanged && !workspaceOrErrorChanged) {
        return;
      }

      const { error } = workspaceSliceKey.getSliceStateAsserted(store.state);

      if (error) {
        return;
      }

      const { location } = pageSliceKey.getSliceStateAsserted(store.state);
      const incomingWsName = pathnameToWsName(location.pathname);

      const { wsName, openedWsPaths, workspacesInfo } =
        workspaceSliceKey.getSliceStateAsserted(store.state);

      if (!incomingWsName) {
        if (wsName) {
          store.dispatch({
            name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
            value: {
              wsName: undefined,
              openedWsPaths: OpenedWsPaths.createEmpty(),
            },
          });
        }

        return;
      }

      // Only touch primary and secondary in case of a location update
      const incomingOpenedWsPaths = openedWsPaths
        .updatePrimaryWsPath(pathnameToWsPath(location.pathname))
        .updateSecondaryWsPath(searchToWsPath(location.search));

      if (!workspacesInfo) {
        return;
      }

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
        incomingWsName !== wsName ||
        !openedWsPaths.equal(incomingOpenedWsPaths)
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

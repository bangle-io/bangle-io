import type { ApplicationStore } from '@bangle.io/create-store';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import {
  pageSliceKey,
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
} from '@bangle.io/slice-page';
import { abortableSetInterval } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { workspaceSliceKey } from './common';
import { WORKSPACE_INFO_CACHE_REFRESH_INTERVAL } from './config';
import { WORKSPACE_NOT_FOUND_ERROR, WorkspaceError } from './errors';
import { getStorageProviderOpts } from './file-operations';
import {
  storageProviderErrorHandlerFromExtensionRegistry,
  storageProviderFromExtensionRegistry,
  validateOpenedWsPaths,
} from './helpers';
import {
  getWsName,
  goToInvalidPathRoute,
  goToWsNameRouteNotFoundRoute,
} from './operations';
import { readWorkspaceInfo } from './read-ws-info';
import { storageProviderHelpers } from './storage-provider-helpers';
import {
  clearCachedWorkspaceInfo,
  updateCachedWorkspaceInfo,
} from './workspaces-operations';

const LOG = false;

const log = LOG
  ? console.debug.bind(console, 'slice-workspace effects')
  : () => {};

export const errorHandlerEffect = workspaceSliceKey.effect(() => {
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

        if (errorHandler && errorHandler(error as any, store)) {
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
});

export const refreshWsPathsEffect = workspaceSliceKey.effect(() => {
  let abort = new AbortController();

  return {
    async deferredUpdate(store, prevState) {
      const [changed] = workspaceSliceKey.didChange(store.state, prevState)(
        'refreshCounter',
        'error',
        'wsName',
      );

      if (!changed) {
        return;
      }

      const { error, wsName } = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      );

      if (error) {
        log('returning early error');

        return;
      }

      if (!wsName) {
        log('returning early wsName');

        return;
      }

      const { state } = store;

      console.count('called');
      const wsInfo = await readWorkspaceInfo(wsName);

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
});

// This keeps a copy of location changes within the workspace slice
// to derive fields like wsName.
export const updateLocationEffect = workspaceSliceKey.effect(() => {
  return {
    async deferredUpdate(store, prevState) {
      const [errorChanged] = workspaceSliceKey.didChange(
        store.state,
        prevState,
      )('error');

      const [locationChanged] = pageSliceKey.didChange(
        store.state,
        prevState,
      )('location');

      if (!locationChanged && !errorChanged) {
        return;
      }

      const { error } = workspaceSliceKey.getSliceStateAsserted(store.state);

      if (error) {
        return;
      }

      const { location } = pageSliceKey.getSliceStateAsserted(store.state);
      const incomingWsName = pathnameToWsName(location.pathname);

      const { wsName, openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      );

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

      const incomingOpenedWsPaths = (
        wsName !== incomingWsName
          ? // if workspace change, retain primary and secondary and clear everything else
            OpenedWsPaths.createEmpty()
          : // if it is the same, retain everything and update primary secondary to match
            // the new location.
            openedWsPaths
      )
        .updatePrimaryWsPath(pathnameToWsPath(location.pathname))
        .updateSecondaryWsPath(searchToWsPath(location.search));

      const workspaceInfo = await readWorkspaceInfo(incomingWsName);

      if (!workspaceInfo) {
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

export const workspaceNotFoundCheckEffect = workspaceSliceKey.effect(() => {
  const handle = async (store: ApplicationStore, wsName: string) => {
    const workspaceInfo = await readWorkspaceInfo(wsName);

    if (!workspaceInfo) {
      // only reroute if the wsName is still the same
      if (getWsName()(store.state) === wsName) {
        goToWsNameRouteNotFoundRoute(wsName)(store.state, store.dispatch);
      }

      return;
    }
  };

  return {
    async deferredOnce(store, signal) {
      const { wsName } = workspaceSliceKey.getSliceStateAsserted(store.state);

      if (wsName) {
        handle(store, wsName);
      }
    },
    async update(store, prevState) {
      const wsName = workspaceSliceKey.getValueIfChanged(
        'wsName',
        store.state,
        prevState,
      );

      if (wsName) {
        handle(store, wsName);
      }
    },
  };
});

// periodically fetches workspace info and also updates it if wsName changes
export const cachedWorkspaceInfoEffect = workspaceSliceKey.effect(() => {
  return {
    async deferredOnce(store, signal) {
      const wsName = getWsName()(store.state);

      if (wsName) {
        updateCachedWorkspaceInfo(wsName)(store.state, store.dispatch, store);
      }

      abortableSetInterval(
        () => {
          const wsName = getWsName()(store.state);

          if (wsName) {
            updateCachedWorkspaceInfo(wsName)(
              store.state,
              store.dispatch,
              store,
            );
          }
        },
        signal,
        WORKSPACE_INFO_CACHE_REFRESH_INTERVAL,
      );
    },
    async update(store, prevState) {
      const currentWsName = getWsName()(store.state);
      const prevWsName = getWsName()(prevState);

      if (currentWsName && currentWsName !== prevWsName) {
        updateCachedWorkspaceInfo(currentWsName)(
          store.state,
          store.dispatch,
          store,
        );
      } else if (!currentWsName && prevWsName) {
        clearCachedWorkspaceInfo()(store.state, store.dispatch);
      }
    },
  };
});

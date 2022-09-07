import type { ApplicationStore } from '@bangle.io/create-store';
import {
  pageSliceKey,
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
} from '@bangle.io/slice-page';
import { abortableSetInterval } from '@bangle.io/utils';
import { readWorkspaceInfo } from '@bangle.io/workspace-info';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { workspaceSliceKey } from './common';
import { WORKSPACE_INFO_CACHE_REFRESH_INTERVAL } from './config';
import { getStorageProviderOpts } from './file-operations';
import { validateOpenedWsPaths } from './helpers';
import {
  getWsName,
  goToInvalidPathRoute,
  goToWsNameRouteNotFoundRoute,
} from './operations';
import { getStorageProvider } from './storage-provider-operations';
import { updateCachedWorkspaceInfo } from './workspaces-operations';

const LOG = false;

const log = LOG
  ? console.debug.bind(console, 'slice-workspace effects')
  : () => {};

export const refreshWsPathsEffect = workspaceSliceKey.effect(() => {
  let abort = new AbortController();

  return {
    async deferredUpdate(store, prevState) {
      const [changed] = workspaceSliceKey.didChange(store.state, prevState)(
        'refreshCounter',
        'wsName',
      );

      if (!changed) {
        return;
      }

      const { wsName } = workspaceSliceKey.getSliceStateAsserted(store.state);

      if (!wsName) {
        log('returning early wsName');

        return;
      }

      const wsInfo = await readWorkspaceInfo(wsName);

      if (!wsInfo) {
        log('returning early wsInfo');

        return;
      }

      const storageProvider = getStorageProvider(
        wsName,
        wsInfo.type,
      )(store.state);

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
      const [locationChanged] = pageSliceKey.didChange(
        store.state,
        prevState,
      )('location');

      if (!locationChanged) {
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

export const cachedWorkspaceInfoEffect = workspaceSliceKey.effect(() => {
  return {
    async deferredOnce(store, signal) {
      const wsName = getWsName()(store.state);

      if (wsName) {
        updateCachedWorkspaceInfo(wsName)(store.state, store.dispatch, store);
      }

      // periodically fetches workspace info, in case it was changed externally
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

    // and also updates it if wsName changes
    async update(store, prevState) {
      const currentWsName = getWsName()(store.state);
      const prevWsName = getWsName()(prevState);

      if (currentWsName && currentWsName !== prevWsName) {
        updateCachedWorkspaceInfo(currentWsName)(
          store.state,
          store.dispatch,
          store,
        );
      }
    },
  };
});

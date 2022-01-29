import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import { pageSliceKey } from '@bangle.io/slice-page';
import {
  OpenedWsPaths,
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
} from '@bangle.io/ws-path';

import { SideEffect, workspaceSliceKey } from './common';
import { workspaceErrorHandler } from './error-handling';
import {
  getStorageErrorHandler,
  getStorageProviderOpts,
} from './file-operations';
import {
  getWsInfoIfNotDeleted,
  storageProviderFromExtensionRegistry,
  validateOpenedWsPaths,
} from './helpers';
import {
  goToInvalidPathRoute,
  goToWorkspaceHomeRoute,
  goToWsNameRouteNotFoundRoute,
  sliceHasError,
} from './operations';
import { saveWorkspacesInfo } from './workspaces/read-ws-info';
import { listWorkspaces } from './workspaces-operations';

const LOG = true;

const log = LOG
  ? console.debug.bind(console, 'slice-workspace effects')
  : () => {};

export const errorHandlerEffect: SideEffect = () => {
  return {
    async deferredUpdate(store) {
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
  let abort = new AbortController();
  return {
    async deferredUpdate(store, prevState) {
      const [changed, fieldChanged] = workspaceSliceKey.didChange(
        store.state,
        prevState,
      )('refreshCounter', 'error', 'wsName', 'workspacesInfo');

      if (!changed) {
        return;
      }

      log('change refreshWsPathsEffect', fieldChanged);

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
        wsInfo,
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
      const [workspaceSliceChanged, wChangedField] =
        workspaceSliceKey.didChange(store.state, prevState)(
          'workspacesInfo',
          'error',
        );

      const [pageSliceChanged, pChangedField] = pageSliceKey.didChange(
        store.state,
        prevState,
      )('location');

      if (!pageSliceChanged && !workspaceSliceChanged) {
        return;
      }

      log('changed updateLocationEffect', wChangedField, pChangedField);

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

      const incomingOpenedWsPaths = OpenedWsPaths.createFromArray([
        pathnameToWsPath(location.pathname),
        searchToWsPath(location.search),
      ]);

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

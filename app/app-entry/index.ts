/// <reference path="./missing-types.d.ts" />

import * as Comlink from 'comlink';
import React from 'react';
import ReactDOM from 'react-dom';

import { _internal_setStore } from '@bangle.io/api';
import { createNsmStore, initializeBangleStore } from '@bangle.io/bangle-store';
import { APP_ENV, sentryConfig } from '@bangle.io/config';
import { SEVERITY } from '@bangle.io/constants';
import { wireCollabMessageBus } from '@bangle.io/editor-common';
import { setupEternalVars } from '@bangle.io/shared';
import type {
  EternalVars,
  NaukarMainAPI,
  NsmStore,
} from '@bangle.io/shared-types';
import { nsmNotification } from '@bangle.io/slice-notification';
import {
  goToWsNameRouteNotFoundRoute,
  nsmPageSlice,
} from '@bangle.io/slice-page';
import { BaseError } from '@bangle.io/utils';
import { _clearWorker, _setWorker } from '@bangle.io/worker-naukar-proxy';
import { workerSetup } from '@bangle.io/worker-setup';
import {
  readWorkspaceInfo,
  WorkspaceInfoError,
} from '@bangle.io/workspace-info';

import { Entry } from './entry';
import { setEternalVars } from './eternal-vars';
import { runAfterPolyfills } from './run-after-polyfills';

if (typeof window !== undefined && APP_ENV !== 'local') {
  (window as any).Sentry?.onLoad(function () {
    import('./SentryTracing').then(({ Integrations }) => {
      (window as any).Sentry.init({
        ...sentryConfig,
        integrations: [new Integrations.BrowserTracing()],
      });
    });
  });

  if ('scrollRestoration' in window.history) {
    // Back off, browser, I got this...
    window.history.scrollRestoration = 'manual';
  }

  (window as any).simulateError = () => {
    throw new Error('I am a simulated error');
  };
}

runAfterPolyfills(async () => {
  let storeChanged = 0;
  const root = document.getElementById('root');

  const eternalVars = setupEternalVars();
  const abort = new AbortController();

  const editorCollabMessageChannel = new MessageChannel();

  wireCollabMessageBus(
    editorCollabMessageChannel.port1,
    eternalVars.editorCollabMessageBus,
    abort.signal,
  );

  abort.signal.addEventListener(
    'abort',
    () => {
      _clearWorker();
    },
    {
      once: true,
    },
  );

  workerSetup(abort.signal).then((naukar) => {
    naukar.__internal_register_main_cb(
      Comlink.proxy(naukarMainAPI(nsmStore, eternalVars)),
    );

    naukar.editor.registerCollabMessagePort(
      Comlink.transfer(editorCollabMessageChannel.port2, [
        editorCollabMessageChannel.port2,
      ]),
    );

    _setWorker(naukar);
  });

  const nsmStore = createNsmStore(eternalVars);

  setEternalVars(nsmStore, eternalVars);

  (window as any).globalNsmStore = nsmStore;

  _internal_setStore(nsmStore);

  // TODO we need a better way to handle storage errors
  window.addEventListener('unhandledrejection', (event) => {
    if (!event) {
      return;
    }
    const error = event?.reason;

    if (!(error instanceof BaseError)) {
      return;
    }

    if (handleErrors(error, nsmStore, eternalVars)) {
      event.preventDefault();

      return;
    }

    console.warn('Unhandled Rejection at:', event?.reason?.stack || event);
  });

  const store = initializeBangleStore({
    eternalVars,
    onUpdate: () => {
      ReactDOM.render(
        React.createElement(Entry, {
          storeChanged: storeChanged++,
          store,
          nsmStore,
          eternalVars,
        }),
        root,
      );
    },
  });

  // TODO remove this
  (nsmStore as any).oldStore = store;
  (store as any).newStore = nsmStore;

  ReactDOM.render(
    React.createElement(Entry, {
      nsmStore,
      storeChanged: storeChanged++,
      store,
      eternalVars,
    }),
    root,
  );
});

function handleErrors(
  error: BaseError,
  nsmStore: NsmStore,
  eternalVars: EternalVars,
) {
  if (handleWorkspaceInfoErrors(error, nsmStore, eternalVars)) {
    return true;
  }

  // Keep at last
  // TODO always returns true
  if (handleStorageErrors(error, nsmStore, eternalVars)) {
    return true;
  }

  return false;
}

function handleStorageErrors(
  error: BaseError,
  nsmStore: NsmStore,
  eternalVars: EternalVars,
) {
  const wsName = nsmPageSlice.resolveState(nsmStore.state).wsName;

  if (!wsName) {
    console.warn('Unable to handle error as wsName is not set');

    return false;
  }

  readWorkspaceInfo(wsName).then((wsInfo) => {
    if (!wsInfo) {
      console.log('Unable to find workspace info when handling error');

      return;
    }

    const handler = eternalVars.extensionRegistry.getOnStorageErrorHandlers(
      wsInfo.type,
    );

    if (!handler) {
      throw new Error(
        `Unable to find storage error handler for workspace type ${wsInfo.type}`,
      );
    }
    const result = handler(error);

    if (!result) {
      console.error(error);

      nsmStore.dispatch(
        nsmNotification.showNotification({
          severity: SEVERITY.ERROR,
          title: error.name,
          content: error.message,
          uid: `storage-unable-to-handle` + Date.now(),
        }),
      );

      return;
    }
  });

  return true;
}

function handleWorkspaceInfoErrors(
  error: BaseError,
  nsmStore: NsmStore,
  eternalVars: EternalVars,
) {
  const code = error.code as WorkspaceInfoError;
  switch (code) {
    case WorkspaceInfoError.WorkspaceCreateNotAllowed: {
      return false;
    }
    case WorkspaceInfoError.WorkspaceDeleteNotAllowed: {
      return false;
    }
    case WorkspaceInfoError.WorkspaceNotFound: {
      const { wsName } = nsmPageSlice.resolveState(nsmStore.state);

      if (wsName) {
        nsmStore.dispatch(
          goToWsNameRouteNotFoundRoute({
            wsName,
          }),
        );

        return true;
      }

      return false;
    }
    case WorkspaceInfoError.FileRenameNotAllowed: {
      return false;
    }
    default: {
      let x: never = code;

      return false;
    }
  }
}

export function naukarMainAPI(
  store: NsmStore,
  eternalVars: EternalVars,
): NaukarMainAPI {
  const api: NaukarMainAPI = {
    onError: async (error: Error) => {
      try {
        if (error instanceof BaseError) {
          handleErrors(error, store, eternalVars);

          return;
        }
        console.error('Unhandled naukar error', error.message);
        (window as any).Sentry?.captureException(error);
      } catch (e) {
        // important to not throw any error, as it can create infinite loop
        // by sending back to naukar and it sending back to us
        console.error(e);
      }
    },
  };

  return api;
}

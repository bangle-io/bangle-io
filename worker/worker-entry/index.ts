import * as Sentry from '@sentry/browser';

import { APP_ENV, config, sentryConfig } from '@bangle.io/config';
import { STORAGE_ON_CHANGE_EMITTER_KEY } from '@bangle.io/constants';
import type { E2ENaukarTypes } from '@bangle.io/e2e-types';
import type {
  EternalVars,
  NaukarWorkerAPIInternal,
  StorageProviderChangeType,
} from '@bangle.io/shared-types';
import { getSelfType, isWorkerGlobalScope } from '@bangle.io/utils';
import { mainApi, registerMainApi } from '@bangle.io/worker-common';

import { naukarWorkerAPI } from './naukar-worker-api';
import { createNaukarStore } from './store';

// if naukar is running in window, no need to initialize as the app already has one initialized
if (isWorkerGlobalScope() && APP_ENV !== 'local') {
  Sentry.init(sentryConfig);
}

const envType = getSelfType();

// Warning: Do not use comlink proxy here, as this
// function should run in both envs (worker and main)
export function createNaukar(
  eternalVars: EternalVars,
  abortSignal: AbortSignal = new AbortController().signal,
): NaukarWorkerAPIInternal {
  if (envType === 'worker') {
    // eslint-disable-next-line no-restricted-globals
    self.addEventListener('error', (errorEvent) => {
      console.warn('[naukar] error', errorEvent.error);
      console.error(errorEvent.error);
      mainApi().application.onError(errorEvent.error);
      errorEvent.preventDefault();
    });

    // eslint-disable-next-line no-restricted-globals
    self.addEventListener('unhandledrejection', (rejectionEvent) => {
      console.warn('[naukar] unhandledrejection');
      console.error(rejectionEvent.reason);
      mainApi().application.onError(rejectionEvent.reason);
      rejectionEvent.preventDefault();
    });
  }

  const naukarStore = createNaukarStore(eternalVars);

  const workerInterface = naukarWorkerAPI(
    naukarStore,
    eternalVars,
    abortSignal,
  );

  const onStorageProviderChange = (msg: StorageProviderChangeType) => {
    // Note: ensure you also update the main store
    if (
      msg.type === 'delete' ||
      msg.type === 'create' ||
      msg.type === 'rename'
    ) {
      mainApi().replicaSlices.refreshWorkspace();
    }
  };

  eternalVars.storageEmitter.on(
    STORAGE_ON_CHANGE_EMITTER_KEY,
    onStorageProviderChange,
  );

  abortSignal.addEventListener(
    'abort',
    () => {
      naukarStore.destroy();
      eternalVars.storageEmitter.off(
        STORAGE_ON_CHANGE_EMITTER_KEY,
        onStorageProviderChange,
      );
    },
    {
      once: true,
    },
  );

  const helpers: E2ENaukarTypes = {
    config,
  };

  // eslint-disable-next-line no-restricted-globals
  self._e2eNaukarHelpers = helpers;

  return {
    ...workerInterface,
    __internal_register_main_cb: async (mainApi) => {
      registerMainApi(mainApi);

      return true;
    },
  };
}

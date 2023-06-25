import * as Sentry from '@sentry/browser';

import { APP_ENV, sentryConfig } from '@bangle.io/config';
import type {
  EternalVars,
  NaukarWorkerAPIInternal,
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
      mainApi().onError(errorEvent.error);
      errorEvent.preventDefault();
    });

    // eslint-disable-next-line no-restricted-globals
    self.addEventListener('unhandledrejection', (rejectionEvent) => {
      console.warn('[naukar] unhandledrejection');
      console.error(rejectionEvent.reason);
      mainApi().onError(rejectionEvent.reason);
      rejectionEvent.preventDefault();
    });
  }

  const naukarStore = createNaukarStore(eternalVars);

  const workerInterface = naukarWorkerAPI(
    naukarStore,
    eternalVars,
    abortSignal,
  );

  return {
    ...workerInterface,
    __internal_register_main_cb: async (mainApi) => {
      registerMainApi(mainApi);

      return true;
    },
  };
}

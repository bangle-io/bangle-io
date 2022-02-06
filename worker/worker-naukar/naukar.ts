import * as Sentry from '@sentry/browser';

import type { Manager } from '@bangle.dev/collab-server';

import { APP_ENV, sentryConfig } from '@bangle.io/config';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import {
  asssertNotUndefined,
  BaseError,
  getSelfType,
  isWorkerGlobalScope,
} from '@bangle.io/utils';

import { abortableServices } from './abortable-services';
import { getEditorManager } from './slices/editor-manager-slice';
import { initializeNaukarStore } from './store/initialize-naukar-store';

const LOG = false;

const log = LOG ? console.log.bind(console, 'naukar') : () => {};

// if naukar is running in window, no need to initialize as the app already has one initialized
if (isWorkerGlobalScope() && APP_ENV !== 'local') {
  Sentry.init(sentryConfig);
}

export interface StoreRef {
  current: undefined | ReturnType<typeof initializeNaukarStore>;
}

// Things to remember about the return type
// 1. Do not use comlink proxy here, as this function should run in both envs (worker and main)
// 2. Keep the return type simple and flat. Ie. an object whose values are not object.
export function createNaukar(extensionRegistry: ExtensionRegistry) {
  const envType = getSelfType();
  const storeRef: StoreRef = {
    current: undefined,
  };

  console.debug('Naukar running in ', envType);

  // main-dispatch-end

  const handleCollabRequest: Manager['handleRequest'] = async (...args) => {
    asssertNotUndefined(
      storeRef.current,
      'handleCollabRequest called but store is not yet defined',
    );

    const store = storeRef.current;

    let editorManager = getEditorManager()(store.state, store.dispatch);

    asssertNotUndefined(
      editorManager,
      'handleCollabRequest called but editorManager is not yet defined',
    );

    return editorManager.handleRequest(...args);
  };

  // eslint-disable-next-line no-restricted-globals
  if (typeof self !== 'undefined') {
    // eslint-disable-next-line no-restricted-globals, no-undef
    (self as any).storeRef = storeRef;
  }

  return {
    // app state
    async sendMessagePort(port: MessageChannel['port2']) {
      storeRef.current = initializeNaukarStore({ port, extensionRegistry });
    },

    // collab
    handleCollabRequest,

    async status() {
      return true;
    },

    async testGetStore() {
      return storeRef.current;
    },

    async testDestroyStore() {
      storeRef.current?.destroy();
      storeRef.current = undefined;
    },

    async testIsWorkerEnv() {
      return isWorkerGlobalScope();
    },

    async testThrowError() {
      throw new Error('[worker] I am a testThrowError');
    },

    async testHandlesBaseError(e: BaseError) {
      // send back the base error to test if transfer is working
      if (e instanceof BaseError) {
        return new BaseError({ message: 'Send me to main', code: 'TEST_CODE' });
      }

      return false;
    },

    async testThrowCallbackError() {
      setTimeout(() => {
        throw new Error('[worker] I am a testThrowCallbackError');
      }, 0);
    },

    ...abortableServices({ storeRef }),
  };
}

export type WorkerAPI = ReturnType<typeof createNaukar>;

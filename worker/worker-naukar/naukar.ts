import * as Sentry from '@sentry/browser';

import type { Manager } from '@bangle.dev/collab-server';

import { sentryConfig } from '@bangle.io/config';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import {
  asssertNotUndefined,
  getSelfType,
  isWorkerGlobalScope,
} from '@bangle.io/utils';

import { abortableServices } from './abortable-services';
import { getEditorManager } from './slices/editor-manager-slice';
import { initializeNaukarStore } from './store/initialize-naukar-store';

const LOG = false;

const log = LOG ? console.log.bind(console, 'naukar') : () => {};

// if naukar is running in window, no need to initialize as the app already has one initialized
if (isWorkerGlobalScope()) {
  Sentry.init(sentryConfig);
}

// Things to remember about the return type
// 1. Do not use comlink proxy here, as this function should run in both envs (worker and main)
// 2. Keep the return type simple and flat. Ie. an object whose values are not object.
export function createNaukar(extensionRegistry: ExtensionRegistry) {
  const envType = getSelfType();

  console.debug('Naukar running in ', envType);

  let store: ReturnType<typeof initializeNaukarStore> | undefined;

  // main-dispatch-end

  const handleCollabRequest: Manager['handleRequest'] = async (...args) => {
    asssertNotUndefined(
      store,
      'handleCollabRequest called but store is not yet defined',
    );

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
    (self as any).store = store;
  }
  return {
    // app state
    async sendMessagePort(port: MessageChannel['port2']) {
      store = initializeNaukarStore({ port, extensionRegistry });
    },

    // collab
    handleCollabRequest,

    async status() {
      return true;
    },

    async testGetStore() {
      return store;
    },

    async testDestroyStore() {
      store?.destroy();
      store = undefined;
    },

    testThrowError() {
      throw new Error('[worker] I am a testThrowError');
    },

    testThrowCallbackError() {
      setTimeout(() => {
        throw new Error('[worker] I am a testThrowCallbackError');
      }, 0);
    },

    ...abortableServices({ extensionRegistry }),
  };
}

export type WorkerAPI = ReturnType<typeof createNaukar>;

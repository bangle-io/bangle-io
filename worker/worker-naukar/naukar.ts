import * as Sentry from '@sentry/browser';

import { APP_ENV, sentryConfig } from '@bangle.io/config';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { StorageProviderChangeType } from '@bangle.io/shared-types';
import type { Emitter } from '@bangle.io/utils';
import {
  assertNotUndefined,
  BaseError,
  getSelfType,
  isWorkerGlobalScope,
} from '@bangle.io/utils';
import { getCollabManager } from '@bangle.io/worker-editor';

import { abortableServices } from './abortable-services';
import { initializeNaukarStore } from './store/initialize-naukar-store';
import { createNsmStore } from './store/nsm-store/nsm-store';

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
export function createNaukar(
  extensionRegistry: ExtensionRegistry,
  storageEmitter: Emitter<StorageProviderChangeType>,
) {
  const envType = getSelfType();
  const storeRef: StoreRef = {
    current: undefined,
  };
  console.debug('Naukar running in ', envType);

  // eslint-disable-next-line no-restricted-globals
  if (typeof self !== 'undefined') {
    // eslint-disable-next-line no-restricted-globals, no-undef
    (self as any).storeRef = storeRef;
  }

  let sendQueue: any[] = [];
  let sendMessageCb: ((message: any) => void) | undefined = undefined;

  const nsmNaukarStore = createNsmStore({
    extensionRegistry,
    storageEmitter,
    sendMessage: (message) => {
      if (sendMessageCb) {
        sendMessageCb(message);
      } else {
        sendQueue.push(message);
      }
    },
  });

  return {
    // setup up store and store syncing
    async sendMessagePort(port: MessageChannel['port2']) {
      storeRef.current = initializeNaukarStore({
        port,
        extensionRegistry,
      });
    },

    async status() {
      return true;
    },

    async nsmNaukarStoreReceive(m: any) {
      nsmNaukarStore.receiveMessage(m);
    },
    async nsmNaukarStoreRegisterCb(cb: (m: any) => void) {
      sendMessageCb = cb;
      sendQueue.forEach((m) => {
        cb(m);
      });
      sendQueue = [];
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

    async testRequestDeleteCollabInstance(wsPath: string) {
      assertNotUndefined(storeRef.current, 'storeRef.current must be defined');
      const collabManager = getCollabManager()(storeRef.current.state);
      assertNotUndefined(collabManager, 'collabManager must be defined');
      collabManager.requestDeleteInstance(wsPath);
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

// enforce that naukar returns the correct type
function assertCorrectReturn<
  R extends (...args: any[]) => any,
  T extends { [k: string]: R },
  F extends (...args: any[]) => T,
>(func: F): void {}
assertCorrectReturn(createNaukar);

export type WorkerAPI = ReturnType<typeof createNaukar>;

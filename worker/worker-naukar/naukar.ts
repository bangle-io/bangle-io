import * as Sentry from '@sentry/browser';

import { CollabMessageBus } from '@bangle.dev/collab-manager';

import { APP_ENV, sentryConfig } from '@bangle.io/config';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import {
  assertNotUndefined,
  BaseError,
  getSelfType,
  isWorkerGlobalScope,
} from '@bangle.io/utils';

import { abortableServices } from './abortable-services';
import { setNewEditorManager } from './slices/worker-editor-slice';
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

  const collabMessageBus = new CollabMessageBus({});

  // eslint-disable-next-line no-restricted-globals
  if (typeof self !== 'undefined') {
    // eslint-disable-next-line no-restricted-globals, no-undef
    (self as any).storeRef = storeRef;
  }

  let unregisterCollabReceiveMessage = () => {};
  let previousPort: MessagePort | undefined;

  return {
    // setup up store and store syncing
    async sendMessagePort(port: MessageChannel['port2']) {
      storeRef.current = initializeNaukarStore({
        port,
        extensionRegistry,
        collabMessageBus,
      });
    },

    // collab
    setNewEditorManager() {
      assertNotUndefined(
        storeRef.current,
        'setNewEditorManager called but store is not yet defined',
      );

      const store = storeRef.current;
      setNewEditorManager(extensionRegistry, collabMessageBus)(
        store.state,
        store.dispatch,
        store,
      );
    },
    registerCollabMessagePort(port: MessageChannel['port2']) {
      previousPort?.close();
      unregisterCollabReceiveMessage();
      previousPort = port;

      let seen = new WeakSet();
      // TODO implement buffering if manager is not ready yet
      unregisterCollabReceiveMessage = collabMessageBus.receiveMessages(
        CollabMessageBus.WILD_CARD,

        (message) => {
          // prevent posting the same message that it received
          if (seen.has(message)) {
            return;
          }

          port.postMessage(message);
        },
      );

      port.onmessage = ({ data }) => {
        seen.add(data);
        collabMessageBus.transmit(data);
      };
    },

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

// enforce that naukar returns the correct type
function assertCorrectReturn<
  R extends (...args: any[]) => any,
  T extends { [k: string]: R },
  F extends (...args: any[]) => T,
>(func: F): void {}
assertCorrectReturn(createNaukar);

export type WorkerAPI = ReturnType<typeof createNaukar>;

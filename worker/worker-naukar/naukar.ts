import * as Sentry from '@sentry/browser';

import { APP_ENV, sentryConfig } from '@bangle.io/config';
import { wireCollabMessageBus } from '@bangle.io/editor-common';
import type { EternalVars } from '@bangle.io/shared-types';
import {
  assertNotUndefined,
  BaseError,
  getSelfType,
  isWorkerGlobalScope,
} from '@bangle.io/utils';
import {
  getCollabManager,
  nsmWorkerEditor,
  setCollabManager,
} from '@bangle.io/worker-editor';

import { abortableServices } from './abortable-services';
import { createNsmStore } from './store';

// if naukar is running in window, no need to initialize as the app already has one initialized
if (isWorkerGlobalScope() && APP_ENV !== 'local') {
  Sentry.init(sentryConfig);
}

// Things to remember about the return type
// 1. Do not use comlink proxy here, as this function should run in both envs (worker and main)
// 2. Keep the return type simple and flat. Ie. an object whose values are not object.
export function createNaukar(
  eternalVars: EternalVars,
  abortSignal: AbortSignal = new AbortController().signal,
) {
  const envType = getSelfType();

  console.debug('Naukar running in ', envType);

  let nsmSendQueue: any[] = [];
  let nsmSendMessageCb: ((message: any) => void) | undefined = undefined;

  const { extensionRegistry } = eternalVars;

  const nsmNaukarStore = createNsmStore({
    eternalVars,
    sendMessage: (message) => {
      if (nsmSendMessageCb) {
        nsmSendMessageCb(message);
      } else {
        nsmSendQueue.push(message);
      }
    },
  });
  // TODO ensure errors are sent to sentry
  const unhandledError = (error: Error) => {
    Sentry.captureException(error);
    console.error(error);
  };

  return {
    async status() {
      return true;
    },

    async nsmNaukarStoreReceive(m: any) {
      nsmNaukarStore.receiveMessage(m);
    },

    async nsmNaukarStoreRegisterCb(cb: (m: any) => void) {
      nsmSendMessageCb = cb;
      nsmSendQueue.forEach((m) => {
        console.log('handling queued message', m);
        cb(m);
      });
      nsmSendQueue = [];
    },

    async testIsWorkerEnv() {
      return isWorkerGlobalScope();
    },

    async testThrowError() {
      throw new Error('[worker] I am a testThrowError');
    },

    async testRequestDeleteCollabInstance(wsPath: string) {
      const collabManager = getCollabManager(
        nsmWorkerEditor.getState(nsmNaukarStore.store.state),
      );
      assertNotUndefined(collabManager, 'collabManager must be defined');

      collabManager.requestDeleteInstance(wsPath);
    },

    async registerCollabMessagePort(
      port: MessageChannel['port2'],
      handleStorageError: (error: Error) => void,
    ) {
      wireCollabMessageBus(
        port,
        eternalVars.editorCollabMessageBus,
        abortSignal,
      );

      setCollabManager(
        nsmNaukarStore.store.dispatch,
        eternalVars,
        abortSignal,
        (error) => {
          handleStorageError(error);
        },
      );
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

    ...abortableServices({ extensionRegistry }),
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

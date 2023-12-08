import * as Sentry from '@sentry/browser';
import * as Comlink from 'comlink';

import { AppDatabaseInMemory } from '@bangle.io/app-database-in-memory';
import { AppDatabaseIndexedDB } from '@bangle.io/app-database-indexeddb';
import { sentryConfig } from '@bangle.io/config';
import { Emitter } from '@bangle.io/emitter';
import { assertWorkerGlobalScope } from '@bangle.io/global-scope-helpers';
import { Naukar } from '@bangle.io/naukar';
import { setupEternalVarsWorker } from '@bangle.io/setup-eternal-vars/worker';
import { NaukarBare } from '@bangle.io/shared-types';

import { logger } from '../logger';
import type { NaukarInitialize } from '../types';

Sentry.init({
  dsn: sentryConfig.dsn,
  environment: sentryConfig.environment,
  release: sentryConfig.release,
});

assertWorkerGlobalScope();

Comlink.expose(setupNaukar());

function setupNaukar(): NaukarInitialize & NaukarBare {
  const emitter = Emitter.create<{ event: 'ready'; payload: undefined }>();
  let ready = false;
  let naukarInstance: Naukar | undefined;

  const onReady = new Promise<void>((resolve) => {
    emitter.on('ready', () => {
      ready = true;
      resolve();
    });
  });

  const naukarInitialize: NaukarInitialize = {
    initialize: async (config) => {
      if (ready) {
        logger.warn('naukar already initialized');
        return;
      }
      const database =
        config.debugFlags.testAppDatabase === 'memory'
          ? new AppDatabaseInMemory()
          : new AppDatabaseIndexedDB();

      const eternalVars = setupEternalVarsWorker({
        type: 'worker',
        debugFlags: config.debugFlags,
        baseDatabase: database,
        parentInfo: config.parentInfo,
        // this is not actually ever used as we directly terminate the worker
        // this exists so that we can have some way to abort it in tests.
        // For more context see the code that sets up eternalVars for the testDebugFlag debugFlags.testDisableWorker
        abortSignal: new AbortController().signal,
      });

      naukarInstance = new Naukar({
        eternalVars,
      });

      const { testDelayWorkerInitialize } = config.debugFlags;

      if (typeof testDelayWorkerInitialize === 'number') {
        logger.warn(
          'test: delaying worker setup by',
          testDelayWorkerInitialize,
        );
        setTimeout(() => {
          emitter.emit('ready', undefined);
        }, testDelayWorkerInitialize);
      } else {
        emitter.emit('ready', undefined);
      }
    },
    isReady: async () => {
      if (ready) {
        return true;
      }
      await onReady;
      return true;
    },
  };

  const allowedKeys = new Set(Object.keys(naukarInitialize));

  const result: any = new Proxy(
    {},
    {
      get(_, prop, receiver) {
        if (allowedKeys.has(prop as string)) {
          return Reflect.get(naukarInitialize, prop, receiver);
        }

        // we have checks to ensure that in naukarInstance all keys are only method type -- (..args:any)=>any
        return (...args: any[]) => {
          return onReady.then(() => {
            const func = Reflect.get(naukarInstance!, prop, receiver);
            return Reflect.apply(func, naukarInstance!, args);
          });
        };
      },
    },
  );

  return result;
}

import * as Comlink from 'comlink';

import { AppDatabaseInMemory } from '@bangle.io/app-database-in-memory';
import { AppDatabaseIndexedDB } from '@bangle.io/app-database-indexeddb';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { assertNonWorkerGlobalScope } from '@bangle.io/global-scope-helpers';
import { Naukar } from '@bangle.io/naukar';
import { setupEternalVarsWorker } from '@bangle.io/setup-eternal-vars/worker';
import type {
  DebugFlags,
  NaukarBare,
  NaukarRemote,
} from '@bangle.io/shared-types';

import { logger } from './logger';
import { NaukarInitialize } from './types';

// we are in the main window thread
assertNonWorkerGlobalScope();

/**
 * We need certain input from the main thread to setup the worker.
 * because of this need, we use `proxy` to hang any calls to the worker (promise is not resolved
 * until the initialize is complete).
 */
export function setupWorker({ debugFlags }: { debugFlags: DebugFlags }): {
  naukarRemote: NaukarRemote;
  naukarTerminate: () => Promise<void>;
} {
  // directly load the worker code in main thread, helpful for testing
  if (debugFlags.testDisableWorker) {
    const database =
      debugFlags.testAppDatabase === 'memory'
        ? new AppDatabaseInMemory()
        : new AppDatabaseIndexedDB();

    logger.warn('Worker is disabled');
    const eternalVars = setupEternalVarsWorker({
      type: 'worker',
      debugFlags: debugFlags,
      baseDatabase: database,
      parentInfo: {
        browserContextId: BROWSING_CONTEXT_ID,
      },
    });
    const naukarInstance = new Naukar({
      eternalVars,
    });

    // This proxy exists to simulate the async nature of comlink remote
    const naukarRemote = new Proxy({} as Comlink.Remote<NaukarBare>, {
      get(target, prop, receiver) {
        // convert every method into async
        return async (...args: any[]) => {
          const func = Reflect.get(naukarInstance, prop, receiver);
          return Reflect.apply(func, naukarInstance, args);
        };
      },
    });

    return {
      naukarRemote: naukarRemote,
      naukarTerminate: async () => {
        //
      },
    };
  }
  const worker = new Worker(
    new URL('./worker-scope-only/worker.ts', import.meta.url),
    {
      type: 'module',
    },
  );

  const naukarConstructor: Comlink.Remote<NaukarInitialize & NaukarBare> =
    Comlink.wrap(worker);

  // we donot await for initialize to complete
  // since we setup the naukarConstructor in a way
  // that it will automatically await any calls to it
  // until initialize is complete. This is done
  // via proxy, see the worker.ts file.
  void naukarConstructor.initialize({
    url: window.location.href,
    debugFlags,
    parentInfo: {
      browserContextId: BROWSING_CONTEXT_ID,
    },
  });

  void naukarConstructor.isReady().then((isReady) => {
    logger.debug('naukar worker is ready');
  });

  const naukarTerminate = async () => {
    logger.warn('Terminating naukar worker');
    naukarConstructor[Comlink.releaseProxy]();
    // wait for comlink to release proxy
    // if we terminate immediately proxy is not released
    return Promise.resolve().then(() => {
      worker.terminate();
    });
  };

  return {
    // we only expose the remote interface
    naukarRemote: naukarConstructor,
    naukarTerminate,
  };
}

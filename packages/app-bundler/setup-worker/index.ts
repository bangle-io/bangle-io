import * as Comlink from 'comlink';

import { assertNonWorkerGlobalScope } from '@bangle.io/global-scope-helpers';
import type {
  DebugFlags,
  NaukarBare,
  NaukarRemote,
} from '@bangle.io/shared-types';

import { logger } from './logger';
import { NaukarInitialize } from './types';

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

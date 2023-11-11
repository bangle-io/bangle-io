import * as Comlink from 'comlink';

import { assertNonWorkerGlobalScope } from '@bangle.io/global-scope-helpers';
import type {
  DebugFlags,
  NaukarBare,
  NaukarRemote,
} from '@bangle.io/shared-types';

import { NaukarInitialize } from './types';

assertNonWorkerGlobalScope();

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
  // that it will await any calls to it
  // until initialize is complete. This is done
  // use proxy, see the worker.ts file.
  void naukarConstructor.initialize({
    url: window.location.href,
    debugFlags,
  });
  void naukarConstructor.isReady().then((isReady) => {
    console.debug('naukar worker is ready');
  });

  const naukarTerminate = async () => {
    console.warn('Terminating naukar worker');
    naukarConstructor[Comlink.releaseProxy]();
    // wait for comlink to release proxy
    // if we terminate immediately proxy is not released
    worker.terminate();
  };

  return {
    naukarRemote: naukarConstructor,
    naukarTerminate,
  };
}

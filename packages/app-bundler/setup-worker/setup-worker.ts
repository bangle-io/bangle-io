import * as Comlink from 'comlink';

import { assertNonWorkerGlobalScope } from '@bangle.io/global-scope-helpers';
import type { NaukarRemote } from '@bangle.io/shared-types';

assertNonWorkerGlobalScope();

export function setupWorker() {
  const worker = new Worker(
    new URL('./worker-scope-only/worker.ts', import.meta.url),
    {
      type: 'module',
    },
  );

  const naukarRemote: NaukarRemote = Comlink.wrap(worker);

  // naukarRemote.isOk().then((isOk) => {
  //   console.log('naukar isOk', isOk);
  // });

  const naukarTerminate = async () => {
    console.warn('Terminating naukar worker');
    naukarRemote[Comlink.releaseProxy]();
    // wait for comlink to release proxy
    // if we terminate immediately proxy is not released
    worker.terminate();
  };

  return {
    naukarRemote,
    naukarTerminate,
  };
}

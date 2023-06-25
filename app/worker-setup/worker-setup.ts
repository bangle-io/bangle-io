import type { NaukarWorkerAPIInternal } from '@bangle.io/shared-types';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

import { WORKER_SUPPORTED } from './worker-support';

assertNonWorkerGlobalScope();

export async function workerSetup(
  abortSignal: AbortSignal,
): Promise<NaukarWorkerAPIInternal> {
  console.log('Initializing naukar.... t=', performance.now());
  const result = await loadNaukarModule(WORKER_SUPPORTED);

  abortSignal.addEventListener(
    'abort',
    () => {
      result.terminate?.();
    },

    { once: true },
  );

  return result.naukar;
}

export async function loadNaukarModule(loadWebworker: boolean): Promise<{
  naukar: NaukarWorkerAPIInternal;
  terminate?: () => Promise<void>;
}> {
  // both these files intialize the naukar module the same way
  // the only difference is the execution environment, one of them
  // we instantiate a worker and the other will run it in main thread.
  if (loadWebworker) {
    const mod = await import('./setup/wrap-worker-naukar');

    return {
      naukar: mod.wrapper as any,
      terminate: mod.terminate,
    };
  } else {
    const { default: res } = await import('./setup/naukar-init');

    return { naukar: res };
  }
}

import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

assertNonWorkerGlobalScope();

export async function loadNaukarModule(loadWebworker: boolean): Promise<{
  naukar: import('@bangle.io/worker-naukar').WorkerAPI;
  destroy?: () => void;
}> {
  // both these files intialize the naukar module the same way
  // the only difference is the execution environment, one of them
  // we instantiate a worker and the other will run it in main thread.
  if (loadWebworker) {
    const mod = await import('./setup/wrap-worker-naukar');
    let result = await mod.getWorker();
    return {
      naukar: result.wrapper as any,
      destroy: result.destroy,
    };
  } else {
    const { default: res } = await import('./setup/naukar-init');
    return { naukar: res };
  }
}

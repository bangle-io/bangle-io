import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

assertNonWorkerGlobalScope();

export async function workerSetup(loadWebworker: boolean): Promise<{
  naukar: import('@bangle.io/naukar-worker').WorkerAPI;
  terminate?: () => void;
}> {
  // both these files intialize the naukar module the same way
  // the only difference is the execution environment, one of them
  // we instantiate a worker and the other will run it in main thread.
  if (loadWebworker) {
    const mod = await import('./setup/wrap-naukar-worker');
    return {
      naukar: mod.wrapper as any,
      terminate: mod.terminate,
    };
  } else {
    const { default: res } = await import('./setup/naukar-init');
    return { naukar: res };
  }
}

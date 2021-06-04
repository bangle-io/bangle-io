import { useEffect } from 'react';
import { setNaukarReady } from 'naukar-proxy/index';

export function WorkerSetup({ loadWebworker }) {
  useEffect(() => {
    workerSetup(loadWebworker);
    return () => {};
  }, [loadWebworker]);

  return null;
}

async function workerSetup(loadWebworker) {
  const { default: naukar } = loadWebworker
    ? // both these files intialize the naukar module the same way
      // the only difference is the execution environment, one of them
      // we instantiate a worker and the other will run it in main thread.
      await import('./setup/wrap-naukar-worker')
    : await import('./setup/naukar-init');

  // Tell the proxy that the worker is ready
  // this will resolve the promise blocking anyone from
  // accessing naukar methods
  setNaukarReady(naukar);
}

/// <reference path="../missing-types.d.ts" />

import * as Comlink from 'comlink';

import { assertNonWorkerGlobalScope, sleep } from '@bangle.io/utils';

// eslint-disable-next-line import/no-unresolved
import Worker from './expose-worker-naukar.worker?worker';

assertNonWorkerGlobalScope();

// TODO fix me

let previousWait: Promise<void> | undefined;

export const getWorker = async () => {
  if (previousWait) {
    console.log('has previous await');
    await previousWait;
  }

  const worker = new (Worker as any)();
  const wrapper = Comlink.wrap(worker);

  return {
    wrapper,
    destroy: async () => {
      wrapper[Comlink.releaseProxy]();
      previousWait = sleep(1000);
      // wait for comlink to release proxy
      // if we terminate immediately proxy is not released
      await previousWait;

      previousWait = undefined;
      worker.terminate();
    },
  };
};

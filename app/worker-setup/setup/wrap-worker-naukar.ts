/// <reference path="../missing-types.d.ts" />

import * as Comlink from 'comlink';

import { assertNonWorkerGlobalScope, sleep } from '@bangle.io/utils';

assertNonWorkerGlobalScope();

const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module',
});

export const wrapper = Comlink.wrap(worker);

export const terminate = async () => {
  console.warn('Terminating naukar worker');
  wrapper[Comlink.releaseProxy]();
  // wait for comlink to release proxy
  // if we terminate immediately proxy is not released
  await sleep(100);
  worker.terminate();
};

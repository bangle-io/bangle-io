/// <reference path="../missing-types.d.ts" />

import * as Comlink from 'comlink';

import { assertNonWorkerGlobalScope, sleep } from '@bangle.io/utils';

// eslint-disable-next-line import/no-unresolved
import Worker from './expose-naukar-worker.worker?worker';

assertNonWorkerGlobalScope();

// TODO fix me
const worker = new (Worker as any)();

export const wrapper = Comlink.wrap(worker);
export const terminate = async () => {
  wrapper[Comlink.releaseProxy]();
  // wait for comlink to release proxy
  // if we terminate immediately proxy is not released
  await sleep(100);
  worker.terminate();
};

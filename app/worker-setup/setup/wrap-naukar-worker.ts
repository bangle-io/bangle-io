/// <reference path="../missing-types.d.ts" />

import * as Comlink from 'comlink';
import { validateNonWorkerGlobalScope } from 'naukar-worker';
// eslint-disable-next-line import/no-unresolved
import Worker from './expose-naukar-worker.worker?worker';

validateNonWorkerGlobalScope();

// TODO fix me
const worker = new (Worker as any)();

export default Comlink.wrap(worker);

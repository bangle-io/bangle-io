import * as Comlink from 'comlink';
import { validateNonWorkerGlobalScope } from 'naukar-worker/index';
// eslint-disable-next-line import/no-unresolved
import Worker from './expose-naukar-worker.worker?worker';

validateNonWorkerGlobalScope();

const worker = new Worker();

export default Comlink.wrap(worker);

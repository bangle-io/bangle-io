import * as Comlink from 'comlink';
import { validateNonWorkerGlobalScope } from 'brahmaan-worker/index';
// eslint-disable-next-line import/no-unresolved
import Worker from './expose-brahmaan-worker.worker?worker';

validateNonWorkerGlobalScope();

const worker = new Worker();

export default Comlink.wrap(worker);

import { validateNonWorkerGlobalScope } from 'naukar-worker/index';
import { WorkerSetup } from './WorkerSetup';

validateNonWorkerGlobalScope();

export { WorkerSetup };

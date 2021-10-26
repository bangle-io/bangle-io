import { validateNonWorkerGlobalScope } from 'naukar-worker';

import { WorkerSetup } from './WorkerSetup';

validateNonWorkerGlobalScope();

export { WorkerSetup };

import { validateNonWorkerGlobalScope } from '@bangle.io/naukar-worker';

import { WorkerSetup } from './WorkerSetup';

validateNonWorkerGlobalScope();

export { WorkerSetup };

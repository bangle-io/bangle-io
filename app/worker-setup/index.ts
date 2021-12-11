import { validateNonWorkerGlobalScope } from '@bangle.io/utils';

import { WorkerSetup } from './WorkerSetup';

validateNonWorkerGlobalScope();

export { WorkerSetup };

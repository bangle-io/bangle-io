import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

import { workerSlice } from './worker-slice';

assertNonWorkerGlobalScope();

export { workerSlice };

import './comlink-transfer-handlers';
import './module-support';

import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

assertNonWorkerGlobalScope();
export { workerSetup } from './worker-setup';

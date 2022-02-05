import './comlink-transfer-handlers';

import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

export { checkModuleWorkerSupport } from './module-support';
export { workerSetupSlices } from './worker-setup-slice';

assertNonWorkerGlobalScope();

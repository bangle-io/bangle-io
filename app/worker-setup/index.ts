import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

import { workerLoaderSlice } from './worker-loader-slice';
import { workerStoreSyncSlices } from './worker-store-sync-slices';

export { checkModuleWorkerSupport } from './module-support';

assertNonWorkerGlobalScope();

export const workerSetupSlices = () => [
  workerLoaderSlice(),
  ...workerStoreSyncSlices(),
];

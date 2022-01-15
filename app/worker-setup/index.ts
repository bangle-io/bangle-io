import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

import { workerLoaderSlice } from './worker-loader-slice';
import { workerStoreSyncSlices } from './worker-store-sync-slices';

assertNonWorkerGlobalScope();

export const workerSetupSlices = () => [
  workerLoaderSlice(),
  ...workerStoreSyncSlices(),
];

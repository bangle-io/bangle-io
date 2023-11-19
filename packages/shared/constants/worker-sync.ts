import { WorkerWindowStoreReplica } from '@bangle.io/shared-types';

export const defaultWorkerWindowStoreReplica: WorkerWindowStoreReplica = {
  // NOTE: should values should always empty so worker can start from a clean slate
  //  and not go out of sync
  ui: {},
  page: {},
};

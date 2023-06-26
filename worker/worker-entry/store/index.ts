import type { InferSliceName } from '@bangle.io/nsm';
import { Store, timeoutSchedular } from '@bangle.io/nsm';
import type { EternalVars } from '@bangle.io/shared-types';
import { nsmWorkerEditor } from '@bangle.io/worker-editor';
import { replicaWorkspaceSlice } from '@bangle.io/worker-replica-slices';

export type NaukarStore = Store<
  | InferSliceName<typeof replicaWorkspaceSlice>
  | InferSliceName<typeof nsmWorkerEditor>
>;

export function createNaukarStore(eternalVars: EternalVars): NaukarStore {
  const store = Store.create({
    storeName: 'naukar-store',
    scheduler: timeoutSchedular(5),
    debug: (log) => {
      if (log.type === 'TX') {
        console.group(
          '[naukar] TX >',
          log.sourceSliceLineage,
          '>',
          log.actionId,
        );
        console.info(log.payload);
        console.info(log);
        console.groupEnd();
      } else {
        // console.info('NSM', log.type, log);
      }
    },
    // Note: when adding new slice, also update type NaukarStore
    state: [
      // first: replica readonly slices
      replicaWorkspaceSlice,
      // worker slices
      nsmWorkerEditor,
    ],
  });

  return store;
}

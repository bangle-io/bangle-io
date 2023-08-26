import { setupStore } from '@bangle.io/bangle-store-context';
import { config, IS_TEST_ENV } from '@bangle.io/config';
import type { Slice, Store } from '@bangle.io/nsm-3';
import type { EternalVars } from '@bangle.io/shared-types';
import { mainApi } from '@bangle.io/worker-common';
import { workerEditorEffects } from '@bangle.io/worker-editor';
import { replicaWorkspaceSlice } from '@bangle.io/worker-replica-slices';

type InferSliceName<T> = T extends Slice<infer N, any, any> ? N : never;

export type NaukarStore = Store<InferSliceName<typeof replicaWorkspaceSlice>>;

export function createNaukarStore(eternalVars: EternalVars): NaukarStore {
  const naukarStore = setupStore({
    type: 'worker',
    otherStoreParams: {
      debug: (log) => {
        if (IS_TEST_ENV) {
          return;
        }

        console.group(`[naukar] ${log.type} update`);
        console.log(log);
        console.groupEnd();
      },
    },
    eternalVars,
    effects: workerEditorEffects,
    onRefreshWorkspace: () => {
      mainApi().replicaSlices.refreshWorkspace();
    },

    // Note: when adding new slice, also update type NaukarStore
    slices: [
      // first: replica readonly slices
      replicaWorkspaceSlice,
      // worker slices
    ],
  });

  return naukarStore;
}

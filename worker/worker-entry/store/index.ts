import type { Slice, Store } from '@bangle.io/nsm-3';
import {
  DEFAULT_DISPATCH_TRANSACTION,
  store,
  TX_META_DISPATCH_SOURCE,
} from '@bangle.io/nsm-3';
import type { EternalVars } from '@bangle.io/shared-types';
import { workerEditorEffects } from '@bangle.io/worker-editor';
import { replicaWorkspaceSlice } from '@bangle.io/worker-replica-slices';

type InferSliceName<T> = T extends Slice<infer N, any, any> ? N : never;

export type NaukarStore = Store<InferSliceName<typeof replicaWorkspaceSlice>>;

export function createNaukarStore(eternalVars: EternalVars): NaukarStore {
  const naukarStore = store({
    storeName: 'naukar-store',
    dispatchTransaction: (store, updateState, tr) => {
      DEFAULT_DISPATCH_TRANSACTION(store, updateState, tr);

      console.group(
        '[naukar] TX >',
        tr.metadata.getMetadata(TX_META_DISPATCH_SOURCE),
      );
      for (const step of tr.steps) {
        console.info(tr.txId, step.targetSliceId, step.sourceSliceId);
      }
      console.groupEnd();
    },

    // Note: when adding new slice, also update type NaukarStore
    slices: [
      // first: replica readonly slices
      replicaWorkspaceSlice,
      // worker slices
    ],
  });

  workerEditorEffects.forEach((effect) => {
    naukarStore.registerEffect(effect);
  });

  return naukarStore;
}

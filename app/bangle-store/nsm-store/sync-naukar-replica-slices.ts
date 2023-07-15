import { effect } from '@bangle.io/nsm-3';
import { nsmSliceFileSha } from '@bangle.io/nsm-slice-file-sha';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

const syncNaukarWorkspaceReplica = effect(
  function syncNaukarWorkspaceReplica(store) {
    const { wsName } = nsmPageSlice.track(store);
    const { openedFiles } = nsmSliceFileSha.track(store);

    naukarProxy.replicaSlices.setReplicaWorkspaceState({
      wsName,
      openedFilesSha: openedFiles,
    });
  },
  { deferred: false },
);
export const syncNaukarReplicaEffects = [syncNaukarWorkspaceReplica];

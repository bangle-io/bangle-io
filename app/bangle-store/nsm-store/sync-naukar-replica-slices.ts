import { syncChangeEffect } from '@bangle.io/nsm';
import { nsmSliceFileSha } from '@bangle.io/nsm-slice-file-sha';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

const syncNaukarWorkspaceReplica = syncChangeEffect(
  'syncNaukarWorkspaceReplica',
  {
    wsName: nsmPageSlice.pick((s) => s.wsName),
    openedFiles: nsmSliceFileSha.pick((s) => s.openedFiles),
  },
  ({ wsName, openedFiles }) => {
    naukarProxy.replicaSlices.setReplicaWorkspaceState({
      wsName,
      openedFilesSha: openedFiles,
    });
  },
);

export const syncNaukarReplicaSlices = [syncNaukarWorkspaceReplica];

import { actUpdateEntry } from '@bangle.io/nsm-slice-file-sha';
import type { NaukarMainAPI } from '@bangle.io/shared-types';
import { refreshWorkspace } from '@bangle.io/slice-refresh-workspace';

import type { createNsmStore } from './nsm-store';

// wires up the main store for naukar to update the
// counter part of its replica slices
export function naukarReplicaSlicesDispatch(
  nsmStore: ReturnType<typeof createNsmStore>,
): NaukarMainAPI['replicaSlices'] {
  const replicaSlicesInterface: NaukarMainAPI['replicaSlices'] = {
    replicaWorkspaceUpdateFileShaEntry: async (obj) => {
      nsmStore.dispatch(actUpdateEntry(obj), {
        debugInfo:
          'naukarReplicaSlicesDispatch.replicaWorkspaceUpdateFileShaEntry',
      });
    },

    refreshWorkspace: async () => {
      nsmStore.dispatch(refreshWorkspace(), {
        debugInfo: 'naukarReplicaSlicesDispatch.refreshWorkspace',
      });
    },
  };

  return replicaSlicesInterface;
}

import type { NaukarReplicaWorkspaceState } from '@bangle.io/constants';
import type { EternalVars, NaukarWorkerAPI } from '@bangle.io/shared-types';
import { replicaWorkspaceSlice } from '@bangle.io/worker-replica-slices';

import type { NaukarStore } from '../store';

// WARNING: These actions should not be directly used!
// This is to prevent accidental update of replica slices.
// replica slices should be treated as read-only.

const _setReplicaWorkspaceState = replicaWorkspaceSlice.action(
  (obj: NaukarReplicaWorkspaceState) => {
    return replicaWorkspaceSlice.tx(() => {
      // completely replace the state
      return obj;
    });
  },
);

export const replicaSlicesInterface = (
  naukarStore: NaukarStore,
  eternalVars: EternalVars,
): NaukarWorkerAPI['replicaSlices'] => {
  const replicaSlicesInterface: NaukarWorkerAPI['replicaSlices'] = {
    setReplicaWorkspaceState: async (state) => {
      naukarStore.dispatch(_setReplicaWorkspaceState(state));
    },
  };

  return replicaSlicesInterface;
};

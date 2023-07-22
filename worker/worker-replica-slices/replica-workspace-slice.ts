import type { NaukarReplicaWorkspaceState } from '@bangle.io/constants';
import { slice } from '@bangle.io/nsm-3';

const initState: NaukarReplicaWorkspaceState = {
  wsName: undefined,
  openedFilesSha: {},
};

export const replicaWorkspaceSlice = slice([], {
  name: 'naukar/replicaWorkspace',
  state: initState,
});

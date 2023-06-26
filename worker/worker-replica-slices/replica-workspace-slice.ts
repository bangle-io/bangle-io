import type { NaukarReplicaWorkspaceState } from '@bangle.io/constants';
import { createSliceV2 } from '@bangle.io/nsm';

const initState: NaukarReplicaWorkspaceState = {
  wsName: undefined,
  openedFilesSha: {},
};

export const replicaWorkspaceSlice = createSliceV2([], {
  name: 'naukar/replicaWorkspace',
  initState,
});

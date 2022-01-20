import { pageSlice, PageSliceAction } from '@bangle.io/slice-page';
import { WorkspaceSliceAction } from '@bangle.io/slice-workspace';
import { workspacesSlice } from '@bangle.io/slice-workspaces-manager';
import { createTestStore as _createTestStore } from '@bangle.io/test-utils/create-test-store';

import { historySlice } from '../history-slice';

export function createTestStore(
  slices = [pageSlice(), historySlice(), workspacesSlice()],
) {
  return _createTestStore<PageSliceAction | WorkspaceSliceAction>(slices);
}

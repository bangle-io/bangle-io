import { pageSlice, PageSliceAction } from '@bangle.io/slice-page';
import {
  workspaceSlice,
  WorkspaceSliceAction,
} from '@bangle.io/slice-workspace';
import { createTestStore as _createTestStore } from '@bangle.io/test-utils/create-test-store';

import { historySlice } from '../history-slice';

export function createTestStore(
  slices = [pageSlice(), historySlice(), workspaceSlice()],
) {
  return _createTestStore<PageSliceAction | WorkspaceSliceAction>(slices);
}

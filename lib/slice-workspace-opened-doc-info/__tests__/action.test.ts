import type { ActionTestFixtureType } from '@bangle.io/test-utils';
import { createTestStore } from '@bangle.io/test-utils';

import type { WorkspaceOpenedDocInfoAction } from '../common';
import {
  BULK_UPDATE_CURRENT_DISK_SHA,
  SYNC_ENTRIES,
  UPDATE_ENTRY,
} from '../common';
import { workspaceOpenedDocInfoSlice } from '../slice-workspace-opened-doc-info';

// This shape (Record<actionName, action[]>) exists so the we can exhaustively
// make sure every action's serialization has been tested
const testFixtures: ActionTestFixtureType<WorkspaceOpenedDocInfoAction> = {
  [SYNC_ENTRIES]: [
    {
      name: SYNC_ENTRIES,
      value: {
        additions: ['a', 'b'],
        removals: ['c', 'd'],
      },
    },
    {
      name: SYNC_ENTRIES,
      value: {
        additions: [],
        removals: [],
      },
    },
  ],
  [UPDATE_ENTRY]: [
    {
      name: UPDATE_ENTRY,
      value: {
        wsPath: 'a',
        info: {
          pendingWrite: true,
        },
      },
    },
    {
      name: UPDATE_ENTRY,
      value: {
        wsPath: 'a',
        info: {
          lastKnownDiskSha: 'a',
          currentDiskShaTimestamp: 1,
        },
      },
    },
  ],
  [BULK_UPDATE_CURRENT_DISK_SHA]: [
    {
      name: BULK_UPDATE_CURRENT_DISK_SHA,
      value: { data: [{ wsPath: 'a', currentDiskSha: 'a' }] },
    },
    {
      name: BULK_UPDATE_CURRENT_DISK_SHA,
      value: { data: [{ wsPath: 'a', currentDiskSha: null }] },
    },
  ],
};

const fixtures = Object.values(testFixtures).flatMap(
  (r: WorkspaceOpenedDocInfoAction[]) => r,
);

const { store } = createTestStore({
  slices: [workspaceOpenedDocInfoSlice()],
});

test.each(fixtures)(`%# workspace actions serialization`, (action) => {
  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'test-store' });
});

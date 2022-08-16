import type { ActionTestFixtureType } from '@bangle.io/test-utils';
import { createTestStore } from '@bangle.io/test-utils';

import type { WorkspaceOpenedDocInfoAction } from '../common';
import { BULK_UPDATE_SHAS, SYNC_ENTRIES, UPDATE_ENTRY } from '../common';
import { workspaceOpenedDocInfoSlice } from '../slice-workspace-opened-doc-info';

let abortController = new AbortController();
let signal = abortController.signal;

beforeEach(() => {
  abortController = new AbortController();
  signal = abortController.signal;
});

afterEach(() => {
  abortController.abort();
});
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
  [BULK_UPDATE_SHAS]: [
    {
      name: BULK_UPDATE_SHAS,
      value: { data: [{ wsPath: 'a', currentDiskSha: 'a' }] },
    },
    {
      name: BULK_UPDATE_SHAS,
      value: { data: [{ wsPath: 'a', currentDiskSha: null }] },
    },
  ],
};

const fixtures = Object.values(testFixtures).flatMap(
  (r: WorkspaceOpenedDocInfoAction[]) => r,
);

test.each(fixtures)(`%# workspace actions serialization`, (action) => {
  const { store } = createTestStore({
    signal,
    slices: [workspaceOpenedDocInfoSlice()],
  });
  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'test-store' });
});

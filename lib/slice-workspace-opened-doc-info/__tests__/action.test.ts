import type { ActionTestFixtureType } from '@bangle.io/test-utils';
import { createTestStore } from '@bangle.io/test-utils';

import type { WorkspaceOpenedDocInfoAction } from '../common';
import { workspaceOpenedDocInfoSlice } from '../slice-workspace-opened-doc-info';

// This shape (Record<actionName, action[]>) exists so the we can exhaustively
// make sure every action's serialization has been tested
const testFixtures: ActionTestFixtureType<WorkspaceOpenedDocInfoAction> = {
  'action::@bangle.io/slice-workspace-opened-doc-info:update-apple': [
    {
      name: 'action::@bangle.io/slice-workspace-opened-doc-info:update-apple',
      value: {
        apple: '1',
      },
    },
    {
      name: 'action::@bangle.io/slice-workspace-opened-doc-info:update-apple',
      value: {
        apple: '2',
      },
    },
  ],
  'action::@bangle.io/slice-workspace-opened-doc-info:update-banana': [
    {
      name: 'action::@bangle.io/slice-workspace-opened-doc-info:update-banana',
      value: { banana: 1 },
    },
    {
      name: 'action::@bangle.io/slice-workspace-opened-doc-info:update-banana',
      value: { banana: 2 },
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

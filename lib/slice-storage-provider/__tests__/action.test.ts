import type { ActionTestFixtureType } from '@bangle.io/test-utils';
import { createTestStore } from '@bangle.io/test-utils';

import type { StorageProviderAction } from '../common';
import { storageProviderSlice } from '../slice-storage-provider';

// This shape (Record<actionName, action[]>) exists so the we can exhaustively
// make sure every action's serialization has been tested
const testFixtures: ActionTestFixtureType<StorageProviderAction> = {
  'action::@bangle.io/slice-storage-provider:update-apple': [
    {
      name: 'action::@bangle.io/slice-storage-provider:update-apple',
      value: {
        apple: '1',
      },
    },
    {
      name: 'action::@bangle.io/slice-storage-provider:update-apple',
      value: {
        apple: '2',
      },
    },
  ],
  'action::@bangle.io/slice-storage-provider:update-banana': [
    {
      name: 'action::@bangle.io/slice-storage-provider:update-banana',
      value: { banana: 1 },
    },
    {
      name: 'action::@bangle.io/slice-storage-provider:update-banana',
      value: { banana: 2 },
    },
  ],
};

const fixtures = Object.values(testFixtures).flatMap(
  (r: StorageProviderAction[]) => r,
);

const { store } = createTestStore({
  slices: [storageProviderSlice()],
});

test.each(fixtures)(`%# workspace actions serialization`, (action) => {
  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'test-store' });
});

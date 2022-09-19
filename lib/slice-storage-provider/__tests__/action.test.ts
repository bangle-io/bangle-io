import type { ActionTestFixtureType } from '@bangle.io/test-utils';
import { createBareStore } from '@bangle.io/test-utils';

import type { StorageProviderAction } from '../common';
import { storageProviderSlice } from '../slice-storage-provider';

// This shape (Record<actionName, action[]>) exists so the we can exhaustively
// make sure every action's serialization has been tested
const testFixtures: ActionTestFixtureType<StorageProviderAction> = {
  'action::@bangle.io/slice-storage-provider:set-storage-provider-error': [
    {
      name: 'action::@bangle.io/slice-storage-provider:set-storage-provider-error' as const,
      value: {
        serializedError: JSON.stringify({ t: '123' }),
        uid: '123',
        wsName: 'test-1',
        workspaceType: 'test',
      },
    },
  ],
};

const fixtures = Object.values(testFixtures).flatMap(
  (r: StorageProviderAction[]) => r,
);

const { store } = createBareStore({
  slices: [storageProviderSlice()],
});

test.each(fixtures)(`%# workspace actions serialization`, (action) => {
  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'test-store' });
});

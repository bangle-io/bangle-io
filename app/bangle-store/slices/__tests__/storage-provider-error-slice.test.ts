import { Extension } from '@bangle.io/extension-registry';
import {
  createWorkspace,
  getWsName,
  refreshWsPaths,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import { createBasicTestStore, waitForExpect } from '@bangle.io/test-utils';
import { BaseError } from '@bangle.io/utils';

import { storageProviderErrorSlice } from '../storage-provider-error-slice';

const FakeStorageProviderName = 'fake-provider';
const setup = () => {
  class FakeProvider extends IndexedDbStorageProvider {
    name = FakeStorageProviderName;
    description = 'f fake';
  }

  const storageProvider = new FakeProvider();

  const storageErrorCallback = jest.fn(() => true);
  const { store, getAction } = createBasicTestStore({
    slices: [storageProviderErrorSlice()],
    extensions: [
      Extension.create({
        name: 'test-nativefs-storage-provider-ext',
        application: {
          storageProvider: storageProvider,
          onStorageError: storageErrorCallback,
        },
      }),
    ],
  });

  return { getAction, storageErrorCallback, store, storageProvider };
};

test('calls the correct storage provider error handler', async () => {
  const { getAction, store, storageProvider, storageErrorCallback } = setup();

  await createWorkspace('testWs', FakeStorageProviderName, {})(
    store.state,
    store.dispatch,
    store,
  );

  await waitForExpect(() => {
    expect(getWsName()(store.state)).toBe('testWs');
  });

  await waitForExpect(() => {
    expect(
      workspaceSliceKey.getSliceStateAsserted(store.state).cachedWorkspaceInfo,
    ).toEqual({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {},
      name: 'testWs',
      type: FakeStorageProviderName,
    });
  });

  const listAllFilesSpy = jest.spyOn(storageProvider, 'listAllFiles');

  expect(listAllFilesSpy).toBeCalledTimes(0);

  listAllFilesSpy.mockImplementation(() => {
    return Promise.reject(
      new BaseError({ message: 'oops everything went wrong' }),
    );
  });

  refreshWsPaths()(store.state, store.dispatch);

  await waitForExpect(() => {
    expect(storageErrorCallback).toBeCalledTimes(1);
  });

  expect(
    getAction('action::@bangle.io/slice-workspace:set-storage-provider-error'),
  ).toEqual([
    {
      id: expect.any(String),
      name: 'action::@bangle.io/slice-workspace:set-storage-provider-error',
      value: {
        serializedError: expect.any(String),
        uid: expect.any(String),
        workspaceType: 'fake-provider',
        wsName: 'testWs',
      },
    },
  ]);

  expect(storageErrorCallback.mock.calls[0]?.at(0)).toMatchInlineSnapshot(
    `[BaseError: oops everything went wrong]`,
  );
  expect(storageErrorCallback.mock.calls[0]?.at(1)).toBe(store);
});

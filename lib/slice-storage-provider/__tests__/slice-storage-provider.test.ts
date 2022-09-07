import { Extension } from '@bangle.io/extension-registry';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
  waitForExpect,
} from '@bangle.io/test-utils';
import { BaseError } from '@bangle.io/utils';

import { storageProviderSliceKey } from '../common';

const FakeStorageProviderName = 'fake-provider';
const setup = () => {
  class FakeProvider extends IndexedDbStorageProvider {
    name = FakeStorageProviderName;
    description = 'f fake';
  }

  const storageProvider = new FakeProvider();

  const storageErrorCallback = jest.fn(() => true);
  const { store, getAction, getWsName } = createBasicTestStore({
    slices: [
      // storage provider slice is baked in by default
    ],
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

  return {
    getWsName,
    getAction,
    storageErrorCallback,
    store: storageProviderSliceKey.getStore(store),
    storageProvider,
  };
};

test('works', async () => {
  const { store } = await setup();

  expect(storageProviderSliceKey.getSliceState(store.state)).toEqual({
    errors: [],
  });
});

describe('actions', () => {
  test('updates error', async () => {
    const { store, storageProvider } = await setup();

    store.dispatch({
      name: 'action::@bangle.io/slice-storage-provider:set-storage-provider-error',
      value: {
        serializedError: storageProvider.serializeError(
          new BaseError({ message: 'something went wrong' }),
        ),
        uid: '123',
        wsName: 'test-1',
        workspaceType: FakeStorageProviderName,
      },
    });

    expect(storageProviderSliceKey.getSliceState(store.state)).toEqual({
      errors: [
        {
          serializedError: storageProvider.serializeError(
            new BaseError({ message: 'something went wrong' }),
          ),
          uid: '123',
          wsName: 'test-1',
          workspaceType: FakeStorageProviderName,
        },
      ],
    });
  });

  test.only('discards older error', async () => {
    const { store, storageProvider } = await setup();

    Array.from({ length: 6 }, (_, k) => {
      store.dispatch({
        name: 'action::@bangle.io/slice-storage-provider:set-storage-provider-error',
        value: {
          serializedError: storageProvider.serializeError(
            new BaseError({ message: 'something went wrong' }),
          ),
          uid: 'new-' + k,
          wsName: 'test-1',
          workspaceType: FakeStorageProviderName,
        },
      });
    });

    expect(
      storageProviderSliceKey
        .getSliceStateAsserted(store.state)
        .errors.map((r) => r.uid),
    ).toEqual(['new-5', 'new-4', 'new-3', 'new-2', 'new-1']);

    store.dispatch({
      name: 'action::@bangle.io/slice-storage-provider:set-storage-provider-error',
      value: {
        serializedError: storageProvider.serializeError(
          new BaseError({ message: 'something went wrong' }),
        ),
        uid: 'last',
        wsName: 'test-1',
        workspaceType: FakeStorageProviderName,
      },
    });

    expect(
      storageProviderSliceKey
        .getSliceStateAsserted(store.state)
        .errors.map((r) => r.uid),
    ).toEqual(['last', 'new-5', 'new-4', 'new-3', 'new-2']);
  });
});

test('calls the correct storage provider error handler', async () => {
  const { getWsName, store, storageProvider, storageErrorCallback } = setup();

  const wsName = 'testWs';

  const { createTestNote } = await setupMockWorkspaceWithNotes(
    store,
    wsName,
    [
      [`${wsName}:one.md`, `# Hello World 0`],
      [`${wsName}:two.md`, `# Hello World 1`],
    ],
    false,
    FakeStorageProviderName,
  );

  await waitForExpect(() => {
    expect(getWsName()).toBe('testWs');
  });

  const createFileSpy = jest.spyOn(storageProvider, 'createFile');

  expect(createFileSpy).toBeCalledTimes(0);

  createFileSpy.mockImplementation(() => {
    return Promise.reject(
      new BaseError({ message: 'oops everything went wrong' }),
    );
  });

  await createTestNote(`${wsName}:three.md`, `# Hello World 2`, true).catch(
    (error) => {
      store.errorHandler(error);
    },
  );

  await waitForExpect(() => {
    expect(storageErrorCallback).toBeCalledTimes(1);
  });
});

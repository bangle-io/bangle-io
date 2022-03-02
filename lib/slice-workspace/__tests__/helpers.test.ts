import { WorkspaceTypeNative } from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import { IndexedDbStorageProvider } from '@bangle.io/storage';
import { createExtensionRegistry } from '@bangle.io/test-utils';

import { storageProviderFromExtensionRegistry } from '../helpers';
import { storageProviderHelpers } from '../storage-provider-helpers';

describe('storageProviderFromExtensionRegistry', () => {
  test('proxies error correctly', async () => {
    const storageType1 = 'testType';
    class TestProvider1 extends IndexedDbStorageProvider {
      name = storageType1;
    }
    const provider1 = new TestProvider1();
    const readFileSpy1 = jest.spyOn(provider1, 'readFile');
    let error1 = new Error('test error 1');
    readFileSpy1.mockImplementation(async () => {
      throw error1;
    });

    const storageType2 = WorkspaceTypeNative;
    class TestProvider2 extends IndexedDbStorageProvider {
      name = storageType2;
    }
    const provider2 = new TestProvider2();
    const readFileSpy2 = jest.spyOn(provider2, 'readFile');
    let error2 = new Error('test error 2');
    readFileSpy2.mockImplementation(async () => {
      throw error2;
    });

    const onStorageError = jest.fn((error, store) => {
      return true;
    });

    let extensionRegistry = createExtensionRegistry(
      [
        Extension.create({
          name: 'test-extension',
          application: {
            storageProvider: provider1,
            onStorageError: onStorageError,
          },
        }),
        Extension.create({
          name: 'test-extension2',
          application: {
            storageProvider: provider2,
            onStorageError: onStorageError,
          },
        }),
      ],
      {
        editorCore: false,
      },
    );

    const proxiedProvider1 = storageProviderFromExtensionRegistry(
      storageType1,
      extensionRegistry,
    );

    await expect(
      proxiedProvider1?.readFile('test:abcd', {} as any),
    ).rejects.toMatchInlineSnapshot(`[Error: test error 1]`);

    expect(storageProviderHelpers.getStorageProviderNameFromError(error1)).toBe(
      storageType1,
    );

    const proxiedProvider2 = storageProviderFromExtensionRegistry(
      storageType2,
      extensionRegistry,
    );

    await expect(
      proxiedProvider2?.readFile('test:abcd', {} as any),
    ).rejects.toMatchInlineSnapshot(`[Error: test error 2]`);

    expect(storageProviderHelpers.getStorageProviderNameFromError(error2)).toBe(
      storageType2,
    );
  });
});

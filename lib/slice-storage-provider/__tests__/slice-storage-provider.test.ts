import { createBasicTestStore } from '@bangle.io/test-utils';

import { storageProviderKey } from '../common';
import { storageProviderSlice } from '../slice-storage-provider';

const setup = async ({} = {}) => {
  const { store, ...helpers } = createBasicTestStore({
    slices: [storageProviderSlice()],
  });

  return {
    store,
    ...helpers,
  };
};
test('works', async () => {
  const { store } = await setup({});

  expect(storageProviderKey.getSliceState(store.state)).toEqual({
    apple: '',
    banana: 0,
  });
});

describe('actions', () => {
  test('updates apple', async () => {
    const { store } = await setup({});

    store.dispatch({
      name: 'action::@bangle.io/slice-storage-provider:update-apple',
      value: {
        apple: 'apples',
      },
    });

    expect(storageProviderKey.getSliceState(store.state)).toEqual({
      apple: 'apples',
      banana: 0,
    });
  });
});

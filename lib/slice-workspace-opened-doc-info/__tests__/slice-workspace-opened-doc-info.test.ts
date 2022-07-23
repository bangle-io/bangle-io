import { createBasicTestStore } from '@bangle.io/test-utils';

import { workspaceOpenedDocInfoKey } from '../common';
import { workspaceOpenedDocInfoSlice } from '../slice-workspace-opened-doc-info';

const setup = async ({} = {}) => {
  const { store, ...helpers } = createBasicTestStore({
    slices: [workspaceOpenedDocInfoSlice()],
  });

  return {
    store,
    ...helpers,
  };
};
test('works', async () => {
  const { store } = await setup({});

  expect(workspaceOpenedDocInfoKey.getSliceState(store.state)).toEqual({
    apple: '',
    banana: 0,
  });
});

describe('actions', () => {
  test('updates apple', async () => {
    const { store } = await setup({});

    store.dispatch({
      name: 'action::@bangle.io/slice-workspace-opened-doc-info:update-apple',
      value: {
        apple: 'apples',
      },
    });

    expect(workspaceOpenedDocInfoKey.getSliceState(store.state)).toEqual({
      apple: 'apples',
      banana: 0,
    });
  });
});

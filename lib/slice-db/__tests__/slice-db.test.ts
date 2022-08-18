import { createBasicTestStore } from '@bangle.io/test-utils';

import { dbSliceKey } from '../common';

let abortController = new AbortController();
let signal = abortController.signal;

beforeEach(() => {
  abortController = new AbortController();
  signal = abortController.signal;
});

afterEach(() => {
  abortController.abort();
});

const setup = async ({} = {}) => {
  const { store, ...helpers } = createBasicTestStore({
    signal,
    slices: [],
  });

  return {
    store,
    ...helpers,
  };
};
test('works', async () => {
  const { store } = await setup({});

  expect(dbSliceKey.getSliceState(store.state)).toEqual({
    extensionDbs: {},
  });
});

import { PageSliceAction } from '../common';
import { createStore } from './test-utils';

const testFixtures: Array<PageSliceAction> = [
  {
    name: 'action::@bangle.io/page-context:BLOCK_RELOAD',
    value: {
      block: true,
    },
  },
];

const { store } = createStore();

test.each(testFixtures)(`%# workspace actions serialization`, (action) => {
  const res = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'test-store' });
});

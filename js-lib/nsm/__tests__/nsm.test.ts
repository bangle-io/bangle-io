import { Slice } from '../slice';
import { Store } from '../store';

const testSlice1 = Slice.create({
  key: 'test-1',
  initState: { num: 4 },
  actions: {
    increment: (opts: { increment: boolean }) => (state) => {
      return { ...state, num: state.num + (opts.increment ? 1 : 0) };
    },
    decrement: (opts: { decrement: boolean }) => (state) => {
      return { ...state, num: state.num - (opts.decrement ? 1 : 0) };
    },
  },
});

test('empty store', () => {
  const store = Store.create({
    storeName: 'test-store',
    state: {
      slices: [testSlice1],
    },
  });

  store.dispatch(testSlice1.actions.increment({ increment: true }));
  store.dispatch(testSlice1.actions.increment({ increment: true }));
  store.dispatch(testSlice1.actions.increment({ increment: true }));

  expect(testSlice1.getState(store.state)).toEqual({
    num: 7,
  });
  store.dispatch(testSlice1.actions.decrement({ decrement: true }));

  expect(testSlice1.getState(store.state)).toEqual({
    num: 6,
  });
});

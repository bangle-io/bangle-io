import { expectType } from '../common';
import { slice } from '../create';
import { Store } from '../store';

const testSlice1 = slice({
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

const testSlice2 = slice({
  key: 'test-2',
  initState: { name: 'tame' },
  actions: {
    prefix: (prefix: string) => (state) => {
      return { ...state, name: prefix + state.name };
    },
    padEnd: (length: number, pad: string) => (state) => {
      return { ...state, name: state.name.padEnd(length, pad) };
    },
    uppercase: () => (state) => {
      return { ...state, name: state.name.toUpperCase() };
    },
  },
});

const testSlice3 = slice({
  key: 'test-3',
  initState: { name: 'tame' },
  actions: {
    lowercase: () => (state) => {
      return { ...state, name: state.name.toLocaleLowerCase() };
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

  store.state.getSliceState(testSlice1);

  testSlice1.getState(store.state);

  expect(testSlice1.getState(store.state)).toEqual({
    num: 7,
  });
  store.dispatch(testSlice1.actions.decrement({ decrement: true }));

  expect(testSlice1.getState(store.state)).toEqual({
    num: 6,
  });
});

test('dispatching slices that are not registered', () => {
  const store = Store.create({
    storeName: 'test-store',
    // ignore transactions for testing errorful dispatches
    dispatchTx(store, tx) {},
    state: {
      slices: [testSlice1],
    },
  });

  store.dispatch(testSlice1.actions.decrement({ decrement: true }));

  // @ts-expect-error testSlice2 is not in the store, so this should always fail
  store.dispatch(testSlice2.actions.uppercase());
});

test('custom dispatch', () => {
  let count = 0;
  const store = Store.create({
    storeName: 'test-store',
    state: {
      slices: [testSlice1, testSlice2],
    },
    dispatchTx(store, tx) {
      expectType<'test-1' | 'test-2'>(tx.sliceKey);

      let oldState = store.state;
      let newState = store.state.applyTransaction(tx);

      if (newState === oldState) {
        count++;

        return;
      }

      store.updateState(newState);
    },
  });

  store.dispatch(testSlice1.actions.decrement({ decrement: true }));

  // @ts-expect-error testSlice3 is not in the store, so this should always fail
  store.dispatch(testSlice3.actions.lowercase());

  // applyTransaction should be undefined for testSlice3 actions, since it doesn't exist in the store
  expect(count).toBe(1);
});

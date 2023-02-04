import { key, slice } from '../create';
import { timeoutSchedular } from '../effect';
import { ReducedStore, Store } from '../store';

const testSlice1 = slice({
  key: key('test-1', [], { num: 4 }),
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
  key: key('test-2', [], { name: 'tame' }),
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
  key: key('test-3', [], { name: 'tame' }),
  actions: {
    lowercase: () => (state) => {
      return { ...state, name: state.name.toLocaleLowerCase() };
    },
  },
});

describe('ReducedStore', () => {
  test('works', () => {
    const myStore = Store.create({
      storeName: 'myStore',
      scheduler: timeoutSchedular(0),
      state: {
        slices: [testSlice1, testSlice2, testSlice3],
      },
    });
    const reducedStore = new ReducedStore(myStore, [testSlice1, testSlice3]);

    reducedStore.dispatch(testSlice1.actions.increment({ increment: true }));

    // @ts-expect-error - test slice 2 is not in the reduced store
    reducedStore.dispatch(testSlice2.actions.uppercase());

    reducedStore.dispatch(testSlice3.actions.lowercase());

    expect(testSlice3.getState(reducedStore.state)).toEqual(
      testSlice3.getState(myStore.state),
    );

    expect(testSlice1.getState(reducedStore.state)).toEqual(
      testSlice1.getState(myStore.state),
    );

    // @ts-expect-error - test slice 2 is not in the reduced store, we should throw error in future
    expect(testSlice2.getState(reducedStore.state)).toEqual(
      testSlice2.getState(myStore.state),
    );
  });

  test('destroying works', () => {
    const myStore = Store.create({
      storeName: 'myStore',
      scheduler: timeoutSchedular(0),
      state: {
        slices: [testSlice1, testSlice2, testSlice3],
      },
    });
    const reducedStore = myStore.getReducedStore([testSlice1, testSlice3]);

    reducedStore.destroy();

    expect(reducedStore.destroyed).toBe(true);
    expect(myStore.destroyed).toBe(true);
  });
});

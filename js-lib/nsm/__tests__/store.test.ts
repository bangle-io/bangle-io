import { key, slice } from '../create';
import { timeoutSchedular } from '../effect';
import { StoreState } from '../state';
import { ReducedStore, Store, STORE_TX_ID } from '../store';
import { waitUntil } from '../test-helpers';

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

describe('store', () => {
  test('works', () => {
    const myStore = Store.create({
      storeName: 'myStore',
      scheduler: timeoutSchedular(0),
      state: {
        slices: [testSlice1, testSlice2, testSlice3],
      },
    });

    const tx = testSlice1.actions.increment({ increment: true });

    myStore.dispatch(tx);

    expect(tx.getMetadata(STORE_TX_ID)).toBe('myStore-0');

    const tx2 = testSlice1.actions.increment({ increment: true });

    myStore.dispatch(tx2);

    expect(tx2.getMetadata(STORE_TX_ID)).toBe('myStore-1');
  });
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

  test('reduced store props', async () => {
    let providedStore: ReducedStore<any> | null = null;
    let providedPrevState: ReducedStore<any>['state'] | null = null;
    const mySlice = slice({
      key: key('my-slice', [], { num: 4 }),
      actions: {
        addOne: () => (state) => ({ ...state, num: state.num + 1 }),
      },
      effects: {
        update: (sl, store, prevState) => {
          providedStore = store;
          providedPrevState = store.state;
        },
      },
    });

    const myStore = Store.create({
      storeName: 'myStore',
      scheduler: timeoutSchedular(0),
      state: {
        slices: [testSlice1, testSlice2, testSlice3, mySlice],
      },
    });

    const redStore = myStore.getReducedStore([mySlice]);

    redStore.dispatch(mySlice.actions.addOne());

    await waitUntil(myStore.getReducedStore([mySlice]), (state) => {
      return mySlice.getState(state).num === 5;
    });

    expect(providedStore!.state).toEqual(myStore.state);
    expect(providedPrevState).toBeInstanceOf(StoreState);
    expect(mySlice.getState(providedPrevState!)).toMatchInlineSnapshot(`
      {
        "num": 5,
      }
    `);
  });
});

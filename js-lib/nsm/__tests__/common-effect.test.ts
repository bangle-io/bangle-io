import { expectType } from '../common';
import {
  changeEffect,
  effect,
  onceEffect,
  syncOnceEffect,
} from '../common-effects';
import { key, slice } from '../create';
import { timeoutSchedular } from '../effect';
import { Store } from '../store';

function sleep(t = 20): Promise<void> {
  return new Promise((res) => setTimeout(res, t));
}

const testSlice1 = slice({
  key: key(
    'test-1',
    [],
    { num: 4 },
    {
      numSq: (state) => state.num * state.num,
    },
  ),
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
  key: key('test-2', [], { name: 'tame', age: 4 }),
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
  key: key('test-3', [], { name: 'TAME' }),
  actions: {
    lowercase: () => (state) => {
      return { ...state, name: state.name.toLocaleLowerCase() };
    },
    uppercase: () => (state) => {
      return { ...state, name: state.name.toLocaleUpperCase() };
    },
  },
});

describe('onceEffect', () => {
  test('works', async () => {
    let called = jest.fn();
    const once = onceEffect(
      'run-once',
      [testSlice1, testSlice3],
      (state, dispatch) => {
        called({
          testSlice1: testSlice1.getState(state),
          testSlice3: testSlice3.getState(state),
        });

        dispatch(testSlice3.actions.lowercase());

        //   @ts-expect-error - test slice 2 is not a dep
        testSlice2.getState(state);

        testSlice1.getState(state);
      },
    );

    // @ts-expect-error should not expose any actions externally
    once.actions.xyz?.();

    expectType<Record<string, never>>(once.actions);

    const store = Store.create({
      storeName: 'test-store',
      scheduler: timeoutSchedular(0),
      state: {
        slices: [testSlice1, testSlice2, testSlice3, once],
      },
    });

    expect(testSlice3.getState(store.state).name).toEqual('TAME');

    store.dispatch(testSlice1.actions.increment({ increment: true }));

    await sleep(10);
    expect(called).toHaveBeenCalledTimes(1);

    expect(testSlice3.getState(store.state).name).toEqual('tame');

    store.dispatch(testSlice1.actions.increment({ increment: true }));
    store.dispatch(testSlice1.actions.increment({ increment: true }));
    store.dispatch(testSlice1.actions.increment({ increment: true }));

    await sleep(10);
    expect(called).toHaveBeenCalledTimes(1);
    await sleep(10);
    expect(called).toHaveBeenCalledTimes(1);
  });
});

describe('syncOnceEffect', () => {
  test('works', async () => {
    let called = jest.fn();
    const once = syncOnceEffect(
      'run-sync-once',
      [testSlice1, testSlice3],
      (state, dispatch) => {
        called({
          testSlice1: testSlice1.getState(state),
          testSlice3: testSlice3.getState(state),
        });

        dispatch(testSlice3.actions.lowercase());

        //   @ts-expect-error - test slice 2 is not a dep
        testSlice2.getState(state);

        testSlice1.getState(state);
      },
    );

    // @ts-expect-error should not expose any actions externally
    once.actions.xyz?.();

    expectType<Record<string, never>>(once.actions);

    const store = Store.create({
      storeName: 'test-store',
      scheduler: timeoutSchedular(0),
      state: {
        slices: [testSlice1, testSlice2, testSlice3, once],
      },
    });
    expect(testSlice3.getState(store.state).name).toEqual('TAME');
    store.dispatch(testSlice1.actions.increment({ increment: true }));

    // because sync effect execution is queued to a microtask we need to await on promise
    await Promise.resolve();
    expect(called).toHaveBeenCalledTimes(1);
    expect(testSlice3.getState(store.state).name).toEqual('tame');

    store.dispatch(testSlice1.actions.increment({ increment: true }));
    store.dispatch(testSlice1.actions.increment({ increment: true }));
    store.dispatch(testSlice1.actions.increment({ increment: true }));

    await Promise.resolve();
    expect(called).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(called).toHaveBeenCalledTimes(1);
  });
});

describe('effect', () => {
  test('works', async () => {
    const myEffect = effect(
      'myEffect',
      [testSlice1, testSlice2],
      {
        numnum: (state) => testSlice1.getState(state).num,
        foofoo: (state) => testSlice2.getState(state).name,
      },
      (result, dispatch) => {
        // @ts-expect-error - should not be able to invalid keys
        result.xyz?.();

        expectType<number>(result.numnum);
        expectType<string>(result.foofoo);

        let wrongAction = testSlice3.actions.lowercase();
        // @ts-expect-error - should not allow dispatching action from non dep slice
        dispatch(wrongAction);

        if (result.numnum % 2 === 0) {
          dispatch(testSlice1.actions.increment({ increment: true }));
        }
      },
    );

    const store = Store.create({
      storeName: 'test-store',
      scheduler: timeoutSchedular(0),
      state: {
        slices: [testSlice1, testSlice2, testSlice3, myEffect],
      },
    });
  });
});

describe('changeEffect', () => {
  test('works', async () => {
    let call = jest.fn();
    const myEffect = changeEffect(
      'myEffect',
      {
        sl1Num: testSlice1.pick((state) => state.num),
        sl2Name: testSlice2.pick((state) => state.name),
        sl1Square: testSlice1.pick((state) => state.numSq),
      },
      (result, dispatch) => {
        call(result);
        // @ts-expect-error - should not be able to invalid keys
        result.xyz?.();
        expectType<number>(result.sl1Num);
        expectType<string>(result.sl2Name);
        expectType<number>(result.sl1Square);

        let wrongAction = testSlice3.actions.lowercase();
        // @ts-expect-error - should not allow dispatching action from non dep slice
        dispatch(wrongAction);

        if (result.sl1Square % 2 === 0) {
          dispatch(testSlice1.actions.increment({ increment: true }));
        }
      },
    );

    const store = Store.create({
      storeName: 'test-store',
      scheduler: timeoutSchedular(0),
      state: {
        slices: [testSlice1, testSlice2, testSlice3, myEffect],
      },
    });

    await sleep(30);

    expect(call).toHaveBeenCalledTimes(2);
  });

  test('cleanup is called', async () => {
    let call: string[] = [];
    let counter = 0;
    const myEffect = changeEffect(
      'myEffect',
      {
        sl1Num: testSlice1.pick((state) => state.num),
        sl2Name: testSlice2.pick((state) => state.name),
        sl1Square: testSlice1.pick((state) => state.numSq),
      },
      (result, dispatch, signal) => {
        let count = counter++;
        call.push('run' + count);

        signal.addEventListener('abort', () => {
          call.push('abort' + count);
        });

        return () => {
          call.push('cleanup' + count);
        };
      },
    );

    const store = Store.create({
      storeName: 'test-store',
      scheduler: timeoutSchedular(0),
      state: {
        slices: [testSlice1, testSlice2, testSlice3, myEffect],
      },
    });

    await sleep(5);
    expect(call).toMatchInlineSnapshot(`
      [
        "run0",
      ]
    `);

    store.dispatch(testSlice1.actions.increment({ increment: true }));

    await sleep(5);

    expect(call).toMatchInlineSnapshot(`
      [
        "run0",
        "cleanup0",
        "abort0",
        "run1",
      ]
    `);

    // should still call cleanup only once
    store.dispatch(testSlice1.actions.increment({ increment: true }));
    store.dispatch(testSlice1.actions.increment({ increment: true }));
    store.dispatch(testSlice1.actions.increment({ increment: true }));

    await sleep(5);

    expect(call).toMatchInlineSnapshot(`
      [
        "run0",
        "cleanup0",
        "abort0",
        "run1",
        "cleanup1",
        "abort1",
        "run2",
      ]
    `);
  });
});
describe('changeSync', () => {});

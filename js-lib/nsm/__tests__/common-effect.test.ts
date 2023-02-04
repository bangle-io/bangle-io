import { expectType } from '../common';
import { onceEffect, syncOnceEffect } from '../common-effects';
import { key, slice } from '../create';
import { timeoutSchedular } from '../effect';
import { Store } from '../store';

function sleep(t = 20): Promise<void> {
  return new Promise((res) => setTimeout(res, t));
}

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

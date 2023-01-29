// import { actionToActionSnapshot, Slice, SliceKey } from '../slice';

import type { Transaction } from '../common';
import { expectType } from '../common';
import type { Action, RawAction } from '../slice';
import { parseRawActions, Slice } from '../slice';

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

const testSlice2 = Slice.create({
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

describe('actions', () => {
  test('actions works', () => {
    expectType<(p: string) => Transaction<'test-2', string[]>>(
      testSlice2.actions.prefix,
    );

    expect(testSlice2.actions.prefix('me')).toEqual({
      actionId: 'prefix',
      payload: ['me'],
      sliceKey: 'test-2',
    });

    expectType<
      (p: number, p2: string) => Transaction<'test-2', Array<string | number>>
    >(testSlice2.actions.padEnd);

    // @ts-expect-error - since action does not exist should always error
    let wrong = testSlice2.actions.wrong?.();

    let tx = testSlice2.actions.prefix('me');

    expectType<Transaction<'test-2', Array<string | number>>>(tx);

    expect(testSlice2.actions.padEnd(6, 'me')).toEqual({
      actionId: 'padEnd',
      payload: [6, 'me'],
      sliceKey: 'test-2',
    });

    expectType<() => Transaction<'test-2', []>>(testSlice2.actions.uppercase);
    expect(testSlice2.actions.uppercase()).toEqual({
      actionId: 'uppercase',
      payload: [],
      sliceKey: 'test-2',
    });
  });

  test('parseRawActions works', () => {
    type StateType = { num: number };
    type DependencyType = {
      testSlice1: typeof testSlice1;
      testSlice2: typeof testSlice2;
    };

    const myAction: RawAction<number[], StateType, DependencyType> = (p) => {
      expectType<number>(p);

      return (state, depState) => {
        expectType<StateType>(state);
        expectType<{ num: number }>(depState.testSlice1);
        expectType<{ name: string }>(depState.testSlice2);

        // @ts-expect-error - should not allow access of any field in the state
        let testVal = state.xyzWrong;

        // @ts-expect-error - should not allow access to any slice that is not declared
        let testVal2 = depState.testSliceXyz;

        // @ts-expect-error - should not allow access to unknown field in dependency state
        let testVal3 = depState.testSlice2.xyzWrong;

        return state;
      };
    };

    let result = parseRawActions('test-key', { myAction });

    expectType<Action<'test-key', number[]>>(result.myAction);

    expect(result.myAction(1)).toMatchInlineSnapshot(`
    {
      "actionId": "myAction",
      "payload": [
        1,
      ],
      "sliceKey": "test-key",
    }
  `);
  });
});

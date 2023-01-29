// import { actionToActionSnapshot, Slice, SliceKey } from '../slice';

import type { Transaction } from '../common';
import { expectType } from '../common';
import type { Action, RawAction } from '../slice';
import { parseRawActions, Slice } from '../slice';
import { StoreState } from '../state';

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

describe('dependency state', () => {
  describe('case 1', () => {
    const unknownSlice = Slice.create({
      key: 'unknown-test',
      initState: { num: 1 },
      dependencies: [testSlice1],
      actions: {},
    });

    const slice = Slice.create({
      key: 'test',
      initState: { num: 1 },
      dependencies: [testSlice1, testSlice2],
      actions: {
        myAction: (num: number) => (state, storeState) => {
          let testVal1 = testSlice1.getState(storeState);

          let testVal2 = testVal1.num;
          expectType<number>(testVal2);

          // @ts-expect-error - should always error
          let testVal3 = testVal1.xyzWrong;

          return { ...state, num: num + state.num };
        },
        action2: () => (state, storeState) => {
          let testVal2 = testSlice2.getState(storeState);

          // @ts-expect-error - should always error
          let testVal3 = testVal2.xyzWrong;

          expectType<string>(testVal2.name);

          return { ...state, num: state.num + testVal2.name.length };
        },
      },
    });

    const state = StoreState.create({
      slices: [testSlice1, testSlice2, slice],
    });

    test('unknown slice should error', () => {
      expect(() =>
        // @ts-expect-error - slice is not registered should always error
        unknownSlice.getState(state),
      ).toThrowErrorMatchingInlineSnapshot(
        `"Slice "unknown-test" not found in store"`,
      );

      expect(() =>
        // @ts-expect-error - slice does not exist should always error
        state.getSliceState(unknownSlice),
      ).toThrowErrorMatchingInlineSnapshot(
        `"Slice "unknown-test" not found in store"`,
      );
    });
  });
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
    type DependencyType = Array<typeof testSlice1 | typeof testSlice2>;

    const myAction: RawAction<number[], StateType, DependencyType> = (p) => {
      expectType<number>(p);

      return (state, storeState) => {
        expectType<StateType>(state);

        let depState1 = testSlice1.getState(storeState);

        expectType<{ num: number }>(depState1);
        expectType<{ name: string }>(testSlice2.getState(storeState));

        // @ts-expect-error - should not allow access of any field in the state
        let testVal = state.xyzWrong;

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

describe('selectors', () => {
  test('works', () => {
    const slice = Slice.create({
      key: 'test',
      initState: { num: 3 },
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.num };
        },
        action2: (num: number, foo: string, brother: () => void) => (state) =>
          state,
      },
      selectors: {
        numSquared: (state) => state.num * state.num,
      },
    });

    expectType<{ numSquared: (state: { num: number }) => number }>(
      slice.selectors,
    );

    const state = StoreState.create({
      slices: [slice],
    });

    let sliceState = slice.getState(state);

    // @ts-expect-error - should not allow access of unknown field in the state
    let testVal0 = sliceState.xyzWrong;

    expectType<{ num: number }>(sliceState);
    expect(sliceState.num).toBe(3);

    let resolvedSelectors = slice.resolveSelectors(state);

    // @ts-expect-error - should not allow access of unknown field in the state
    let testVal1 = resolvedSelectors.xyzWrong;

    expectType<{ numSquared: number }>(resolvedSelectors);

    expect(resolvedSelectors.numSquared).toEqual(9);
  });

  test('selectors works with dependencies', () => {
    const myTestSlice = Slice.create({
      key: 'my-test',
      initState: { num: 3 },
      actions: {},
    });

    const slice = Slice.create({
      key: 'test',
      initState: { count: 3 },
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.count };
        },
        action2: (num: number, foo: string, brother: () => void) => (state) =>
          state,
      },
      selectors: {
        numSquared: (state, storeState) => {
          const dep = testSlice1.getState(storeState);

          // @ts-expect-error - myTestSlice is not registered as a dependency, so should always ts-error
          myTestSlice.getState(storeState);

          // @ts-expect-error - should not allow access of unknown field in the state
          let testVal0 = dep.xyz;

          let val = state.count + dep.num;

          return val * val;
        },
      },
      dependencies: [testSlice1],
    });

    expectType<{
      numSquared: (state: { count: number }, storeState: StoreState) => number;
    }>(slice.selectors);

    const state = StoreState.create({
      slices: [testSlice1, myTestSlice, slice],
    });

    let resolvedSelectors = slice.resolveSelectors(state);

    // @ts-expect-error - should error when a selector is not defined
    let testVal0 = resolvedSelectors.testXyz;

    expectType<{ numSquared: number }>(resolvedSelectors);

    expect(resolvedSelectors.numSquared).toEqual(49);

    let resolvedValued = slice.resolveState(state);

    // @ts-expect-error - should error when a field is not defined
    let testVal1 = resolvedValued.testXyz;

    expectType<{ count: number; numSquared: number }>(resolvedValued);

    expect(resolvedValued).toEqual({
      count: 3,
      numSquared: 49,
    });
  });

  test('resolving selectors of dependencies', () => {
    const sliceA = Slice.create({
      key: 'sliceA',
      initState: { count: 3 },
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, count: num + state.count };
        },
        action2: (num: number, foo: string, brother: () => void) => (state) =>
          state,
      },
      selectors: {
        numSquared: (state, storeState) => {
          // @ts-expect-error - should not allow access if not defined in dependency
          sliceB.getState(storeState);

          let val = state.count + testSlice1.getState(storeState).num;

          return val * val;
        },
      },
      dependencies: [testSlice1],
    });

    const sliceB = Slice.create({
      key: 'sliceB',
      initState: { count: 3 },
      actions: {},
      selectors: {
        s1: (state) => {
          return false;
        },
        s2: (state) => {
          return true;
        },
      },
      dependencies: [testSlice1],
    });

    const mySliceZ = Slice.create({
      key: 'mySliceZ',
      initState: { muNum: 3 },
      selectors: {
        myMoon: (state, storeState) => {
          expectType<{ count: number }>(sliceA.getState(storeState));

          const sliceBState = sliceB.resolveState(storeState);

          // @ts-expect-error - should not allow access of unknown field in the state
          let testVal1 = sliceBState.testXyz;

          expectType<{ count: number; s1: boolean; s2: boolean }>(sliceBState);

          return (
            state.muNum +
            sliceA.resolveState(storeState).count +
            sliceB.resolveState(storeState).count
          );
        },
      },
      dependencies: [sliceA, sliceB],
    });

    const state = StoreState.create({
      slices: [testSlice1, sliceA, sliceB, mySliceZ],
    });

    expectType<{ count: number }>(sliceA.getState(state));
    expectType<{ numSquared: number }>(sliceA.resolveSelectors(state));
    expectType<{ numSquared: number; count: number }>(
      sliceA.resolveState(state),
    );

    // @ts-expect-error - should error when field is not defined
    let testVal1 = sliceA.resolveState(state).xyz;

    expect(mySliceZ.resolveState(state)).toMatchInlineSnapshot(`
      {
        "muNum": 3,
        "myMoon": 9,
      }
    `);

    let newState = state.applyTransaction(sliceA.actions.myAction(1))!;

    expect(mySliceZ.resolveState(newState)).toEqual({
      muNum: 3,
      myMoon: 10,
    });
  });

  test('type error if using slice outside of dependency', () => {
    const slice = Slice.create({
      key: 'test',
      initState: { count: 3 },
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.count };
        },
        action2: (num: number, foo: string, brother: () => void) => (state) =>
          state,
      },
      selectors: {
        numSquared: (state, storeState) => {
          // @ts-expect-error - should not allow access of any unknown field in the state
          let testVal1 = state.xyzWrong;

          // @ts-expect-error - should error when a slice is not a dependency
          slice5.getState(storeState);
          // @ts-expect-error - should error when a slice is not a dependency
          storeState.getSliceState(testSlice2);

          let depState2 = testSlice1.getState(storeState);

          let depState1 = storeState.getSliceState(testSlice1);

          expect(depState1).toEqual(depState2);

          let val = state.count + depState1.num;

          return val * val;
        },
      },
      dependencies: [testSlice1],
    });

    const slice3 = Slice.create({
      key: 'test3',
      initState: { count: 3 },
      actions: {
        myThing3: () => (state) => state,
      },
    });

    const slice4 = Slice.create({
      key: 'test4',
      initState: { count: 4 },
      actions: {
        myThing4: () => (state) => state,
      },
    });
    const slice5 = Slice.create({
      key: 'test5',
      initState: { count: 5 },
      actions: {
        myThing5: () => (state) => state,
      },
    });
    const slice6 = Slice.create({
      key: 'test6',
      initState: { count: 6 },
      actions: {
        myThing6: () => (state) => state,
      },
    });

    // @ts-expect-error - should error when a selector is not defined
    let f = slice.selectors.testXyz;

    expectType<{
      numSquared: (state: { count: number }, storeState: StoreState) => number;
    }>(slice.selectors);

    const state = StoreState.create({
      slices: [testSlice1, slice, slice4, slice5, slice6],
    });

    // @ts-expect-error - slice3 is not a dependency should also error
    state.applyTransaction(slice3.actions.myThing3());

    state.applyTransaction(slice.actions.myAction(5));
    state.applyTransaction(slice4.actions.myThing4());
    state.applyTransaction(slice6.actions.myThing6());
  });
  test('no selectors', () => {
    const state = StoreState.create({
      slices: [testSlice1],
    });
    expect(testSlice1.resolveState(state)).toEqual({
      num: 4,
    });
  });
});

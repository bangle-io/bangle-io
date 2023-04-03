// import { actionToActionSnapshot, Slice, SliceKey } from '../slice';

import { expectType } from '../common';
import { key, slice } from '../create';
import type { Slice } from '../slice';
import { parseRawActions, testOverrideSlice } from '../slice';
import { StoreState } from '../state';
import { Transaction } from '../transaction';
import type { Action, EffectsBase, RawAction, SelectorFn } from '../types';

const testSliceKey1 = key('test-1', [], { num: 4 });
const testSlice1 = slice({
  key: testSliceKey1,
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
    lord: (prefix: string) => (state) => {
      return { ...state, name: prefix + state.name + 'jesus' };
    },
  },
});

const depOnTestSlice1Slice = slice({
  key: key('dep-test-1', [testSlice1], { myDep: 4, myDepStr: 'hi' }),
  actions: {
    increment: () => (state, storeState) => ({
      ...state,
      myDep: state.myDep + 1 + testSlice1.getState(storeState).num,
    }),
  },
});

describe('dependencies', () => {
  describe('dep state', () => {
    const unknownSlice = slice({
      key: key('unknown-test', [testSlice1], { num: 1 }),
      actions: {},
    });

    const mySlice = slice({
      key: key('my-test-slice', [testSlice1, testSlice2], {
        num: 1,
      }),
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
      slices: [testSlice1, testSlice2, mySlice],
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

  test('cyclic dependencies', () => {
    const mySlice1 = slice({
      key: key('my-slice-1', [testSlice1], {
        myDep: 4,
        myDepStr: 'hi',
      }),
      actions: {},
    });

    const mySlice2 = slice({
      key: key('my-slice-2', [mySlice1], {
        myDep: 4,
        myDepStr: 'hi',
      }),
      actions: {},
    });

    expect(() =>
      StoreState.create({
        slices: [
          testOverrideSlice(testSlice1, {
            dependencies: [mySlice2],
          }),
          depOnTestSlice1Slice,
          mySlice1,
          mySlice2,
        ],
      }),
    ).toThrowError(
      `Circular dependency detected in slice "test-1" dependency "my-slice-2"`,
    );
  });

  test('flat dependencies', () => {
    const createSliceHelper = (k: string, dep: Slice[]) =>
      slice({
        key: key(k, dep, {}),
        actions: {},
      });
    let prev: Slice | undefined = undefined;
    const slices: Slice[] = [];
    for (const key of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      let slice = createSliceHelper(key, prev ? [prev] : []);
      slices.push(slice);
      prev = slice;
    }

    expect([...prev?._flatDependencies!].sort()).toEqual(
      ['g', 'f', 'e', 'd', 'c', 'b', 'a'].sort(),
    );

    expect(prev?.key.dependencies?.[0]?._flatDependencies)
      .toMatchInlineSnapshot(`
      Set {
        "f",
        "e",
        "d",
        "c",
        "b",
        "a",
      }
    `);
  });
});

describe('actions', () => {
  test('actions works', () => {
    expectType<(p: string) => Transaction<'test-2', string[]>>(
      testSlice2.actions.prefix,
    );

    expect(testSlice2.actions.prefix('me')).toEqual(
      new Transaction('test-2', ['me'], 'prefix'),
    );

    expectType<
      (p: number, p2: string) => Transaction<'test-2', Array<string | number>>
    >(testSlice2.actions.padEnd);

    // @ts-expect-error - since action does not exist should always error
    let wrong = testSlice2.actions.wrong?.();

    let tx = testSlice2.actions.prefix('me');

    expectType<Transaction<'test-2', Array<string | number>>>(tx);

    expect(testSlice2.actions.padEnd(6, 'me')).toEqual(
      new Transaction('test-2', [6, 'me'], 'padEnd'),
    );

    expectType<() => Transaction<'test-2', []>>(testSlice2.actions.uppercase);
    expect(testSlice2.actions.uppercase()).toEqual(
      new Transaction('test-2', [], 'uppercase'),
    );
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
      Transaction {
        "_metadata": {},
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
    const mySlice = slice({
      key: key(
        'my-test-slice',
        [],
        { num: 3 },
        {
          numSquared: (state) => state.num * state.num,
        },
      ),

      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.num };
        },
        action2: (num: number, foo: string, brother: () => void) => (state) =>
          state,
      },
    });

    expectType<{ numSquared: (state: { num: number }) => number }>(
      mySlice.selectors,
    );

    const state = StoreState.create({
      slices: [mySlice],
    });

    let sliceState = mySlice.getState(state);

    // @ts-expect-error - should not allow access of unknown field in the state
    let testVal0 = sliceState.xyzWrong;

    expectType<{ num: number }>(sliceState);
    expect(sliceState.num).toBe(3);

    let resolvedSelectors = mySlice.resolveSelectors(state);

    // @ts-expect-error - should not allow access of unknown field in the state
    let testVal1 = resolvedSelectors.xyzWrong;

    expectType<{ numSquared: number }>(resolvedSelectors);

    expect(resolvedSelectors.numSquared).toEqual(9);
  });

  test('selectors works with dependencies', () => {
    const myTestSlice = slice({
      key: key('my-test', [], { num: 3 }),
      actions: {},
    });

    const mySliceKey = key(
      'my-slice-test',
      [testSlice1],
      { count: 3 },
      {
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
    );
    const mySlice = slice({
      key: mySliceKey,
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.count };
        },
        action2: (num: number, foo: string, brother: () => void) => (state) =>
          state,
      },
    });

    expectType<{
      numSquared: (state: { count: number }, storeState: StoreState) => number;
    }>(mySlice.selectors);

    const state = StoreState.create({
      slices: [testSlice1, myTestSlice, mySlice],
    });

    let resolvedSelectors = mySlice.resolveSelectors(state);

    // @ts-expect-error - should error when a selector is not defined
    let testVal0 = resolvedSelectors.testXyz;

    expectType<{ numSquared: number }>(resolvedSelectors);

    expect(resolvedSelectors.numSquared).toEqual(49);

    let resolvedValued = mySlice.resolveState(state);

    // @ts-expect-error - should error when a field is not defined
    let testVal1 = resolvedValued.testXyz;

    expectType<{ count: number; numSquared: number }>(resolvedValued);

    expect(resolvedValued).toEqual({
      count: 3,
      numSquared: 49,
    });
  });

  test('resolving selectors of dependencies', () => {
    const sliceA = slice({
      key: key(
        'sliceA',
        [testSlice1],
        { count: 3 },
        {
          numSquared: (state, storeState) => {
            // @ts-expect-error - should not allow access if not defined in dependency
            sliceB.getState(storeState);

            let val = state.count + testSlice1.getState(storeState).num;

            return val * val;
          },
        },
      ),
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, count: num + state.count };
        },
        action2: (num: number, foo: string, brother: () => void) => (state) =>
          state,
      },
    });

    const sliceB = slice({
      key: key(
        'sliceB',
        [testSlice1],
        { count: 3 },
        {
          s1(state, storeState) {
            return false;
          },
          s2(state, storeState) {
            return true;
          },
        },
      ),
      actions: {},
    });

    const mySliceZ = slice({
      key: key(
        'mySliceZ',
        [sliceA, sliceB],
        { muNum: 3 },
        {
          myMoon(state, storeState) {
            expectType<{ count: number }>(sliceA.getState(storeState));

            const sliceBState = sliceB.resolveState(storeState);

            // @ts-expect-error - should not allow access of unknown field in the state
            let testVal1 = sliceBState.testXyz;

            expectType<{ count: number; s1: boolean; s2: boolean }>(
              sliceBState,
            );

            return (
              state.muNum +
              sliceA.resolveState(storeState).count +
              sliceB.resolveState(storeState).count
            );
          },
        },
      ),
      actions: {},
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
    const mySlice = slice({
      key: key(
        'my-slice-test',
        [testSlice1],
        { count: 3 },
        {
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
      ),
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.count };
        },
        action2: (num: number, foo: string, brother: () => void) => (state) =>
          state,
      },
    });

    const slice3 = slice({
      key: key('test3', [], { count: 3 }),
      actions: {
        myThing3: () => (state) => state,
      },
    });

    const slice4 = slice({
      key: key('test4', [], { count: 4 }),
      actions: {
        myThing4: () => (state) => state,
      },
    });
    const slice5 = slice({
      key: key('test5', [], { count: 5 }),
      actions: {
        myThing5: () => (state) => state,
      },
    });
    const slice6 = slice({
      key: key('test6', [], { count: 6 }),
      actions: {
        myThing6: () => (state) => state,
      },
    });

    // @ts-expect-error - should error when a selector is not defined
    let f = mySlice.selectors.testXyz;

    expectType<{
      numSquared: (state: { count: number }, storeState: StoreState) => number;
    }>(mySlice.selectors);

    const state = StoreState.create({
      slices: [testSlice1, mySlice, slice4, slice5, slice6],
    });

    // @ts-expect-error - slice3 is not a dependency should also error
    state.applyTransaction(slice3.actions.myThing3());

    state.applyTransaction(mySlice.actions.myAction(5));
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

describe('effects', () => {
  test('create effect with dependency', () => {
    const mySlice = slice({
      key: key('mySlice', [testSlice1, testSlice2], { count: 3 }),
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, count: num + state.count };
        },
      },
      effects: {
        update: (sl, store, prevState) => {
          let val = sl.getState(store.state);
          let val2 = mySlice.getState(store.state);

          expectType<{ count: number }>(val);
          expectType<{ count: number }>(val2);

          let val3 = testSlice1.getState(store.state);

          // @ts-expect-error - should not allow access of unknown field in the state
          let testVal = val3.xyzTest;

          expectType<{ num: number }>(val3);

          testSlice2.getState(store.state);
          // @ts-expect-error - should error when a slice is not a dependency
          testSlice3.getState(store.state);
        },
      },
    });
  });

  test('create effect without dependency', () => {
    const mySlice = slice({
      key: key('mySlice', [], { count: 3 }),
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, count: num + state.count };
        },
      },
      effects: {
        update: (sl, store) => {
          let val = sl.getState(store.state);
          let val2 = mySlice.getState(store.state);

          expectType<{ count: number }>(val);
          expectType<{ count: number }>(val2);

          // @ts-expect-error - should not allow access of unknown action
          let testVal1 = sl.actions.xyzTest;
          let act = sl.actions.myAction;
          expectType<Action<'mySlice', number[]>>(act);

          // @ts-expect-error - should not allow access of unknown field in the state
          let testVal = testSlice1.getState(store.state);
        },
      },
    });

    expectType<EffectsBase>(mySlice.effects[0]!);

    expect(mySlice.effects[0]).toBeDefined();
  });
});

describe('creating with slice', () => {
  const dependencies = [testSlice1];
  type Slice1State = { slice1Count: number };
  type Slice1Dependencies = typeof dependencies;

  test('all 3 DS, A, SE', () => {
    const slice1State = { slice1Count: 3 };
    const slice1 = slice({
      key: key('slice1', dependencies, slice1State, {
        numSquared(state, storeState) {
          // @ts-expect-error - should error since testSlice2 is not a dependency
          testSlice2.getState(storeState);

          testSlice1.getState(storeState);

          return state.slice1Count * state.slice1Count;
        },
      }),
      actions: {
        myAction: (num: number) => (state, storeState) => {
          // @ts-expect-error - should error since testSlice2 is not a dependency
          testSlice2.getState(storeState);

          testSlice1.getState(storeState);

          return { ...state, slice1Count: num + state.slice1Count };
        },
      },
    });

    const state = StoreState.create({
      slices: [testSlice1, slice1],
    });
    expectType<{ slice1Count: number }>(slice1.getState(state));

    expectType<typeof dependencies>(slice1.key.dependencies);

    // ACTIONS

    expectType<Action<'slice1', number[]>>(slice1.actions.myAction);

    const rawMyAction = slice1._actionSerializer.rawActions.myAction;

    // @ts-expect-error - should error since raw my accepts a number
    rawMyAction('s');

    expectType<RawAction<number[], Slice1State, Slice1Dependencies>>(
      rawMyAction,
    );

    // SELECTORS
    expectType<SelectorFn<Slice1State, Slice1Dependencies, number>>(
      slice1.key.selectors.numSquared,
    );

    // @ts-expect-error - should error if undefined selector is accessed
    let testVal0 = slice1.key.selectors.xyzTest;
  });

  test('7. A, SE', () => {
    const slice1State = { slice1Count: 3 };
    const slice1 = slice({
      key: key('slice1', [], slice1State, {
        numSquared(state, storeState) {
          // @ts-expect-error - should error since testSlice2 is not a dependency
          testSlice2.getState(storeState);
          // @ts-expect-error - should error since testSlice2 is not a dependency
          testSlice1.getState(storeState);

          return state.slice1Count * state.slice1Count;
        },
      }),
      actions: {
        myAction: (num: number) => (state, storeState) => {
          // @ts-expect-error - should error since testSlice2 is not a dependency
          testSlice2.getState(storeState);

          // @ts-expect-error - should error since testSlice1 is not a dependency
          testSlice1.getState(storeState);

          return { ...state, slice1Count: num + state.slice1Count };
        },
      },
    });

    expectType<never[]>(slice1.key.dependencies);
  });

  test('6. DS, SE', () => {
    const slice1State = { slice1Count: 3 };
    const slice1 = slice({
      key: key('slice1', dependencies, slice1State, {
        numSquared(state, storeState) {
          // @ts-expect-error - should error since testSlice2 is not a dependency
          testSlice2.getState(storeState);
          testSlice1.getState(storeState);

          return state.slice1Count * state.slice1Count;
        },
      }),
      actions: {},
      effects: {
        update: (sl, store) => {
          // @ts-expect-error - should error for unknown field
          let testVal1 = store.state.xyzTest;
          // @ts-expect-error - should error since testSlice2 is not a dependency
          testSlice2.getState(store.state);
          // should not error since testSlice1 is a dependency
          testSlice1.getState(store.state);

          // @ts-expect-error - should error since actions is not defined
          let testVal0 = sl.actions.xyz;
          let t1 = testSlice1.actions.decrement({ decrement: true });
          let t2 = testSlice2.actions.uppercase();

          store.dispatch(t1);

          // @ts-expect-error - should error since testSlice2 is not a dependency
          store.dispatch(t2);
        },
      },
    });

    expectType<typeof dependencies>(slice1.key.dependencies);
    expectType<{}>(slice1.actions);

    // @ts-expect-error - should error since actions is not defined
    let textVal0 = slice1.actions.xyz;
  });
});

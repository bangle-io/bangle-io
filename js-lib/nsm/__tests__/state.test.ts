import { expectType, mapObjectValues } from '../common';
import { slice } from '../create';
import { testOverrideSlice } from '../slice';
import { StoreState } from '../state';

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

const depTestSlice1 = slice({
  key: 'dep-test-1',
  initState: { myDep: 4, myDepStr: 'hi' },
  actions: {
    increment: () => (state, storeState) => ({
      ...state,
      myDep: state.myDep + 1 + testSlice1.getState(storeState).num,
    }),
  },
  dependencies: [testSlice1],
});

describe('applyTransaction', () => {
  test('applyTransaction works', () => {
    const mySlice = slice({
      key: 'test',
      initState: { num: 1 },
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.num };
        },
        action2: (num: number, foo: string, brother: () => void) => (state) =>
          state,
      },
    });

    const state = StoreState.create({
      slices: [mySlice],
    });

    // @ts-expect-error - should error when a field is not defined
    let testVal0 = mySlice.actions.myAction(5).randomValue;

    expectType<number[]>(mySlice.actions.myAction(5).payload);
    expectType<[number, string, () => void]>(
      mySlice.actions.action2(5, 'str', () => {}).payload,
    );

    expect(mySlice.actions.myAction(5).payload).toEqual([5]);
    expect(mySlice.actions.action2(5, 'str', () => {}).payload).toEqual([
      5,
      'str',
      expect.any(Function),
    ]);

    const newState = state.applyTransaction(mySlice.actions.myAction(5))!;

    expect(newState.getSliceState(mySlice)).toEqual({
      num: 6,
    });
  });

  test('applyTransaction works with dependencies', () => {
    const sliceDep1 = slice({
      key: 'test-dep1',
      initState: { num: 50 },
      actions: {},
    });

    const sliceDep2 = slice({
      key: 'test-dep2',
      initState: { num: 3 },
      actions: {},
    });

    const mySlice = slice({
      key: 'test',
      initState: { num: 1 },
      dependencies: [sliceDep1, sliceDep2],
      actions: {
        myAction: (num: number) => (state, storeState) => {
          // @ts-expect-error - should not allow access of any unknown field in the state
          let testVal1 = state.xyzWrong;

          let dep1 = sliceDep1.getState(storeState);

          // @ts-expect-error - should not allow access of any unknown field in the state
          let testVal2 = dep1.xyzWrong;

          let dep2 = sliceDep2.getState(storeState);

          return {
            ...state,
            num: num + state.num + dep1.num + dep2.num,
          };
        },
      },
    });

    const state = StoreState.create({
      slices: [sliceDep1, sliceDep2, mySlice],
    });

    const newState = state.applyTransaction(mySlice.actions.myAction(5))!;

    const result = newState.getSliceState(mySlice);

    // @ts-expect-error - should error when a field is not defined
    let testVal0 = result.xyz;

    expectType<{ num: number } | undefined>(result);

    expect(newState.getSliceState(mySlice)).toEqual({
      num: 50 + 1 + 5 + 3,
    });
  });
});

describe('throwing', () => {
  test('throws error if slice key not unique', () => {
    const mySlice = slice({
      key: 'test',
      initState: { num: 1 },
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.num };
        },
      },
    });

    const mySlice2 = slice({
      key: 'test',
      initState: { num: 1 },
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.num };
        },
      },
    });

    expect(() => {
      StoreState.create({
        slices: [mySlice, mySlice2],
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Duplicate slice keys test"`);
  });

  test('throws error if slice dependency is not registered', () => {
    const sliceDep = slice({
      key: 'test-dep',
      initState: { num: 1 },
      actions: {},
    });
    const mySlice = slice({
      key: 'test',
      initState: { num: 1 },
      dependencies: [sliceDep],
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.num };
        },
      },
    });

    expect(() => {
      StoreState.create({
        slices: [mySlice],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Slice "test" has a dependency on Slice "test-dep" which is either not registered or is registered after this slice."`,
    );
  });

  test('throws error if slice dependency is not registered before', () => {
    const sliceDep = slice({
      key: 'test-dep',
      initState: { num: 1 },
      actions: {},
    });
    const mySlice = slice({
      key: 'test',
      initState: { num: 1 },
      dependencies: [sliceDep],
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.num };
        },
      },
    });

    expect(() => {
      StoreState.create({
        slices: [mySlice, sliceDep],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Slice "test" has a dependency on Slice "test-dep" which is either not registered or is registered after this slice."`,
    );
  });
});

describe('override', () => {
  test('overriding init state works', () => {
    const slice1 = slice({
      key: 'test1',
      initState: { num: 1 },
      actions: {},
    });

    const slice2 = slice({
      key: 'test2',
      initState: { num: 2 },
      actions: {},
    });

    let newState1 = StoreState.create({
      slices: [slice1, testOverrideSlice(slice2, { initState: { num: 99 } })],
    });

    expect(newState1.getSliceState(slice1)).toEqual({ num: 1 });
    expect(newState1.getSliceState(slice2)).toEqual({ num: 99 });

    let newState2 = StoreState.create({
      slices: [testOverrideSlice(slice1, { initState: { num: -1 } }), slice2],
    });
    expect(newState2.getSliceState(slice1)).toEqual({ num: -1 });
    expect(newState1.getSliceState(slice1)).toEqual({ num: 1 });
  });

  test('overriding effects works', () => {
    const slice1 = slice({
      key: 'test1',
      initState: { num: 1 },
      actions: {},
      effects: [
        {
          update: () => {},
        },
      ],
    });

    expect(testOverrideSlice(slice1, { effects: [] }).effects).toHaveLength(0);
    // should not affect initial slice
    expect(slice1.effects).toHaveLength(1);
  });

  test('overriding dependencies', () => {
    const slice1 = slice({
      key: 'test1',
      initState: { num: 1 },
      actions: {},
    });
    expect([
      ...testOverrideSlice(slice1, { dependencies: [testSlice1] })
        ._flatDependencies,
    ]).toEqual([testSlice1.key.key]);

    expect(slice1._flatDependencies.size).toBe(0);
  });
});

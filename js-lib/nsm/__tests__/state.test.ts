import { expectType, mapObjectValues } from '../common';
import { Slice } from '../slice';
import { overrideInitState, StoreState } from '../state';

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

const depTestSlice1 = Slice.create({
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
    const slice = Slice.create({
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
      slices: [slice],
    });

    // @ts-expect-error - should error when a field is not defined
    let testVal0 = slice.actions.myAction(5).randomValue;

    expectType<number[]>(slice.actions.myAction(5).payload);
    expectType<[number, string, () => void]>(
      slice.actions.action2(5, 'str', () => {}).payload,
    );

    expect(slice.actions.myAction(5).payload).toEqual([5]);
    expect(slice.actions.action2(5, 'str', () => {}).payload).toEqual([
      5,
      'str',
      expect.any(Function),
    ]);

    const newState = state.applyTransaction(slice.actions.myAction(5))!;

    expect(newState.getSliceState(slice)).toEqual({
      num: 6,
    });
  });

  test('applyTransaction works with dependencies', () => {
    const sliceDep1 = Slice.create({
      key: 'test-dep1',
      initState: { num: 50 },
      actions: {},
    });

    const sliceDep2 = Slice.create({
      key: 'test-dep2',
      initState: { num: 3 },
      actions: {},
    });

    const slice = Slice.create({
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
      slices: [sliceDep1, sliceDep2, slice],
    });

    const newState = state.applyTransaction(slice.actions.myAction(5))!;

    const result = newState.getSliceState(slice);

    // @ts-expect-error - should error when a field is not defined
    let testVal0 = result.xyz;

    expectType<{ num: number } | undefined>(result);

    expect(newState.getSliceState(slice)).toEqual({
      num: 50 + 1 + 5 + 3,
    });
  });
});

describe('throwing', () => {
  test('throws error if slice key not unique', () => {
    const slice = Slice.create({
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
        slices: [slice, slice],
      });
    }).toThrowError('Duplicate slice keys');
  });

  test('throws error if slice dependency is not registered', () => {
    const sliceDep = Slice.create({
      key: 'test-dep',
      initState: { num: 1 },
      actions: {},
    });
    const slice = Slice.create({
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
        slices: [slice],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Slice "test" has a dependency on Slice "test-dep" which is either not registered or is registered after this slice."`,
    );
  });

  test('throws error if slice dependency is not registered before', () => {
    const sliceDep = Slice.create({
      key: 'test-dep',
      initState: { num: 1 },
      actions: {},
    });
    const slice = Slice.create({
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
        slices: [slice, sliceDep],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Slice "test" has a dependency on Slice "test-dep" which is either not registered or is registered after this slice."`,
    );
  });
});

describe('override', () => {
  test('overrideInitState works', () => {
    const slice1 = Slice.create({
      key: 'test1',
      initState: { num: 1 },
      actions: {},
    });

    const slice2 = Slice.create({
      key: 'test2',
      initState: { num: 2 },
      actions: {},
    });

    let newState = StoreState.create({
      slices: [slice1, overrideInitState(slice2, { num: 99 })],
    });

    expect(newState.getSliceState(slice1)).toEqual({ num: 1 });
    expect(newState.getSliceState(slice2)).toEqual({ num: 99 });

    newState = StoreState.create({
      slices: [overrideInitState(slice1, { num: -1 }), slice2],
    });

    expect(newState.getSliceState(slice1)).toEqual({ num: -1 });
  });
});

import { expectType } from '../common';
import { Slice } from '../slice';
import { overrideInitState, StoreState } from '../state';

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
    storeName: 'test',
    slices: [slice],
  });

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
    dependencies: { sliceDep1, sliceDep2 },
    actions: {
      myAction:
        (num: number) =>
        (state, { sliceDep1, sliceDep2 }) => {
          return {
            ...state,
            num: num + state.num + sliceDep1.num + sliceDep2.num,
          };
        },
    },
  });

  const state = StoreState.create({
    storeName: 'test',
    slices: [sliceDep1, sliceDep2, slice],
  });

  const newState = state.applyTransaction(slice.actions.myAction(5))!;

  expect(newState.getSliceState(slice)).toEqual({
    num: 50 + 1 + 5 + 3,
  });
});

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
      storeName: 'test',
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
    dependencies: { sliceDep },
    actions: {
      myAction: (num: number) => (state) => {
        return { ...state, num: num + state.num };
      },
    },
  });

  expect(() => {
    StoreState.create({
      storeName: 'test',
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
    dependencies: { sliceDep },
    actions: {
      myAction: (num: number) => (state) => {
        return { ...state, num: num + state.num };
      },
    },
  });

  expect(() => {
    StoreState.create({
      storeName: 'test',
      slices: [slice, sliceDep],
    });
  }).toThrowErrorMatchingInlineSnapshot(
    `"Slice "test" has a dependency on Slice "test-dep" which is either not registered or is registered after this slice."`,
  );
});

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
    storeName: 'test',
    slices: [slice1, overrideInitState(slice2, { num: 99 })],
  });

  expect(newState.getSliceState(slice1)).toEqual({ num: 1 });
  expect(newState.getSliceState(slice2)).toEqual({ num: 99 });

  newState = StoreState.create({
    storeName: 'test',
    slices: [overrideInitState(slice1, { num: -1 }), slice2],
  });

  expect(newState.getSliceState(slice1)).toEqual({ num: -1 });
});

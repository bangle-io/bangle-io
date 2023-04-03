import { expectType } from '../common';
import { key, slice } from '../create';
import { testOverrideSlice } from '../slice';
import { StoreState } from '../state';
import { Transaction } from '../transaction';

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

const depTestSlice1 = slice({
  key: key('dep-test-1', [testSlice1], { myDep: 4, myDepStr: 'hi' }),
  actions: {
    increment: () => (state, storeState) => ({
      ...state,
      myDep: state.myDep + 1 + testSlice1.getState(storeState).num,
    }),
  },
});

describe('applyTransaction', () => {
  test('applyTransaction works', () => {
    const mySlice = slice({
      key: key('test', [], { num: 1 }),
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
      key: key('test-dep1', [], { num: 50 }),
      actions: {},
    });
    const sliceDep2 = slice({
      key: key('test-dep2', [], { num: 3 }),
      actions: {},
    });

    const mySlice = slice({
      key: key('test', [sliceDep1, sliceDep2], { num: 1 }),
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

describe('validations', () => {
  test('throws error if slice key not unique', () => {
    const mySlice = slice({
      key: key('test', [], { num: 1 }),
      actions: {
        myAction: (num: number) => (state) => {
          return { ...state, num: num + state.num };
        },
      },
    });

    const mySlice2 = slice({
      key: key('test', [], { num: 1 }),
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
      key: key('test-dep', [], { num: 1 }),
      actions: {},
    });
    const mySlice = slice({
      key: key('test', [sliceDep], { num: 1 }),
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
      key: key('test-dep', [], { num: 1 }),
      actions: {},
    });
    const mySlice = slice({
      key: key('test', [sliceDep], { num: 1 }),
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

describe('test override helper', () => {
  test('overriding init state works', () => {
    const slice1 = slice({
      key: key('test1', [], { num: 1 }),
      actions: {},
    });

    const slice2 = slice({
      key: key('test2', [], { num: 2 }),
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
      key: key('test1', [], { num: 1 }),
      actions: {},
      effects: {
        update: (sl) => {},
      },
    });

    expect(testOverrideSlice(slice1, { effects: [] }).effects).toHaveLength(0);
    // should not affect initial slice
    expect(slice1.effects).toHaveLength(1);
  });

  test('overriding dependencies', () => {
    const slice1 = slice({
      key: key('test1', [], { num: 1 }),
      actions: {},
    });

    expect([
      ...testOverrideSlice(slice1, { dependencies: [testSlice1] })
        ._flatDependencies,
    ]).toEqual([testSlice1.key.key]);

    expect(slice1._flatDependencies.size).toBe(0);
  });
});

describe('State creation', () => {
  test('empty slices', () => {
    const appState = StoreState.create({ slices: [] });

    expect(appState).toMatchInlineSnapshot(`
      StoreState {
        "_slices": [],
        "opts": undefined,
        "slicesCurrentState": {},
      }
    `);
  });

  test('with a slice', () => {
    const mySlice = slice({
      key: key('mySlice', [], { val: null }),
      actions: {},
    });

    const appState = StoreState.create({ slices: [mySlice] });

    expect(appState.getSliceState(mySlice)).toEqual({ val: null });
    expect(appState).toMatchSnapshot();
  });

  test('throws error if action not found', () => {
    const mySlice = slice({
      key: key('mySlice', [], { val: null }),
      actions: {},
    });

    const appState = StoreState.create({ slices: [mySlice] });

    expect(() =>
      appState.applyTransaction(new Transaction('mySlice', [5], 'updateNum')),
    ).toThrowError(`Action "updateNum" not found in Slice "mySlice"`);
  });

  test('applying action preserves states of those who donot have apply', () => {
    const mySlice = slice({
      key: key('mySlice', [], { num: 0 }),
      actions: {},
    });

    const mySlice2 = slice({
      key: key('mySlice2', [], { num: 0 }),
      actions: {
        updateNum: (num: number) => (state) => {
          return { ...state, num };
        },
      },
    });

    const appState = StoreState.create({ slices: [mySlice, mySlice2] });
    expect(mySlice.getState(appState).num).toBe(0);

    let newAppState = appState.applyTransaction(mySlice2.actions.updateNum(4));
    expect(mySlice.getState(newAppState).num).toBe(0);
    expect(mySlice2.getState(newAppState).num).toBe(4);
  });

  test('applying action with selectors', () => {
    const key1 = key(
      'mySlice',
      [],
      {
        char: '1',
      },
      {
        s1: (state) => {
          return {
            val1_1: state.char,
          };
        },
      },
    );

    const mySlice1 = slice({
      key: key1,
      actions: {
        moreChar: (num: number) => (state) => {
          return {
            ...state,
            char: Array.from(
              {
                length: num,
              },
              () => state.char,
            ).join(''),
          };
        },
      },
    });

    const mySlice2 = slice({
      key: key(
        'mySlice2',
        [mySlice1],
        {
          char: '2',
        },
        {
          s2: (state, storeState) => {
            return {
              val2_1: mySlice1.resolveSelectors(storeState).s1,
              val2_2: state.char,
            };
          },
        },
      ),
      actions: {},
    });

    const mySlice3 = slice({
      key: key(
        'mySlice3',
        [mySlice1, mySlice2],
        { char: '3' },
        {
          s3: (state, storeState) => {
            return {
              val3_2: mySlice2.resolveSelectors(storeState).s2,
              val3_1: mySlice1.resolveSelectors(storeState).s1,
              val3_3: state.char,
            };
          },
        },
      ),
      actions: {},
    });

    const appState = StoreState.create({
      slices: [mySlice1, mySlice2, mySlice3],
    });

    const result1 = {
      s3: {
        val3_1: {
          val1_1: '1',
        },
        val3_2: {
          val2_1: {
            val1_1: '1',
          },
          val2_2: '2',
        },
        val3_3: '3',
      },
    };
    expect(mySlice3.resolveSelectors(appState)).toEqual(result1);
    expect(mySlice2.resolveSelectors(appState).s2).toEqual(
      result1['s3']['val3_2'],
    );
    expect(mySlice1.resolveSelectors(appState).s1).toEqual(
      result1['s3']['val3_1'],
    );

    const newAppState = appState.applyTransaction(mySlice1.actions.moreChar(2));

    const result2 = {
      s3: {
        val3_1: {
          val1_1: '11',
        },
        val3_2: {
          val2_1: {
            val1_1: '11',
          },
          val2_2: '2',
        },
        val3_3: '3',
      },
    };

    expect(mySlice3.resolveSelectors(newAppState)).toEqual(result2);
    expect(mySlice2.resolveSelectors(newAppState).s2).toEqual(
      result2['s3']['val3_2'],
    );
    expect(mySlice1.resolveSelectors(newAppState).s1).toEqual(
      result2['s3']['val3_1'],
    );

    // previous state is unaltered
    expect(mySlice3.resolveSelectors(appState)).toEqual(result1);
  });
});

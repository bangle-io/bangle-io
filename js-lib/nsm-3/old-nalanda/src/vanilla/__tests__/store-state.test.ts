import { Transaction } from '../transaction';
import { sliceKey, slice } from '../slice';
import { StoreState } from '../store-state';
import { testCleanup } from '../helpers/test-cleanup';
import { expectType } from '../types';

const sliceOne = slice([], {
  name: 'sliceOne',
  state: {
    keyOne: 'valueOne',
  },
});

const sliceTwo = slice([], {
  name: 'sliceTwo',
  state: { keyTwo: 'valueTwo' },
});

let updateKeyOneSliceOne: (keyOne: string) => Transaction<'sliceOne'>;

let updateKeyTwoSliceTwo: (keyTwo: string) => Transaction<'sliceTwo'>;

beforeEach(() => {
  testCleanup();

  updateKeyOneSliceOne = sliceOne.action((keyOne: string) => {
    let transaction = sliceOne.tx((state) => {
      return sliceOne.update(state, { keyOne });
    });

    return transaction;
  });

  updateKeyTwoSliceTwo = sliceTwo.action((keyTwo: string) => {
    return sliceTwo.tx((state) => {
      return sliceTwo.update(state, { keyTwo });
    });
  });
});

describe('StoreState Slice and Transaction Operations', () => {
  test('correctly applies a single transaction', () => {
    let storeState = StoreState.create({
      slices: [sliceOne, sliceTwo],
    });

    const transaction = updateKeyOneSliceOne('updatedValueOne');

    storeState = storeState.applyTransaction(transaction);

    expect(sliceOne.get(storeState)).toMatchInlineSnapshot(`
      {
        "keyOne": "updatedValueOne",
      }
    `);
    expect(sliceTwo.get(storeState)).toMatchInlineSnapshot(`
      {
        "keyTwo": "valueTwo",
      }
    `);
  });

  test('correctly applies multiple transactions and throws error when applying the same transaction again', () => {
    let store = StoreState.create({
      slices: [sliceOne, sliceTwo],
    });

    const firstTransaction = updateKeyOneSliceOne('updatedValueOne');
    const secondTransaction = updateKeyTwoSliceTwo('updatedValueTwo');

    // Apply multiple transactions to the store and verify state updates
    store = store.applyTransaction(firstTransaction.append(secondTransaction));

    expect(sliceOne.get(store)).toEqual({
      keyOne: 'updatedValueOne',
    });
    expect(sliceTwo.get(store)).toEqual({
      keyTwo: 'updatedValueTwo',
    });

    // Try applying the same transactions again and verify that an error is thrown
    expect(() =>
      store.applyTransaction(firstTransaction),
    ).toThrowErrorMatchingInlineSnapshot(
      `"StoreState.applyTransaction: cannot apply a destroyed transaction"`,
    );

    expect(() =>
      store.applyTransaction(secondTransaction),
    ).toThrowErrorMatchingInlineSnapshot(
      `"StoreState.applyTransaction: cannot apply a destroyed transaction"`,
    );
  });

  test('storeState remains the same if action step does not mutate state', () => {
    const fixedState = {
      keyOne: 'valueOne',
    };
    const immutableSlice = slice([], {
      name: 'immutableSlice',
      state: fixedState,
    });

    const nonMutatingAction = immutableSlice.action((inputNumber: number) => {
      return immutableSlice.tx((store) => {
        return fixedState;
      });
    });

    let store = StoreState.create({
      slices: [sliceOne, immutableSlice],
    });

    let newStoreStateAfterActionOne = store.applyTransaction(
      nonMutatingAction(3),
    );

    expect(newStoreStateAfterActionOne).toBe(store);

    let newStoreStateAfterActionTwo =
      newStoreStateAfterActionOne.applyTransaction(
        updateKeyOneSliceOne('updatedValueOne').append(nonMutatingAction(3)),
      );

    expect(immutableSlice.get(newStoreStateAfterActionTwo)).toBe(fixedState);
  });

  test('step is called with the same instance of storeState if no mutation occurred in previous step', () => {
    const fixedState = {
      keyOne: 'valueOne',
    };
    const immutableSlice = slice([], {
      name: 'immutableSlice',
      state: fixedState,
    });

    const nonMutatingAction = immutableSlice.action((inputNumber: number) => {
      return immutableSlice.tx((store) => {
        return fixedState;
      });
    });

    let storeStateInstances: StoreState<any>[] = [];
    const mutatingAction = immutableSlice.action((inputNumber: number) => {
      return immutableSlice.tx((store) => {
        storeStateInstances.push(store);
        return {
          keyOne: 'newValue',
        };
      });
    });

    let store = StoreState.create({
      slices: [sliceOne, immutableSlice],
    });

    let newStoreStateAfterMutatingAction = store.applyTransaction(
      nonMutatingAction(3).append(mutatingAction(53)),
    );

    expect(storeStateInstances.length).toBe(1);
    expect(storeStateInstances[0]).toBe(store);

    expect(newStoreStateAfterMutatingAction).not.toBe(store);
  });

  test('state from previous step is correctly passed to next step', () => {
    const sliceA = slice([], {
      name: 'sliceA',
      state: {
        counter: 1,
      },
    });

    const sliceB = slice([sliceA], {
      name: 'sliceB',
      state: {
        counter: 1,
      },
    });

    const actionIncrementCounterA = sliceA.action(() => {
      return sliceA.tx((store) => {
        return {
          counter: sliceA.get(store).counter + 1,
        };
      });
    });

    const actionIncrementCounterB = sliceB.action(() => {
      return sliceB.tx((store) => {
        return {
          counter: sliceA.get(store).counter + sliceB.get(store).counter + 1,
        };
      });
    });

    let store = StoreState.create({
      slices: [sliceA, sliceB],
    });

    let newStore = store.applyTransaction(
      actionIncrementCounterA().append(actionIncrementCounterB()),
    );

    expect({
      a: sliceA.get(newStore),
      b: sliceB.get(newStore),
    }).toEqual({
      a: {
        counter: 2,
      },
      b: {
        counter: 4,
      },
    });

    // previous state should not be changed
    expect({
      a: sliceA.get(store),
      b: sliceB.get(store),
    }).toEqual({
      a: {
        counter: 1,
      },
      b: {
        counter: 1,
      },
    });
  });

  test('correctly overrides state', () => {
    let store = StoreState.create({
      slices: [sliceOne, sliceTwo],
      stateOverride: {
        [sliceOne.sliceId]: {
          keyOne: 'newValueOne',
        },
      },
    });

    expect(sliceOne.get(store)).toEqual({
      keyOne: 'newValueOne',
    });

    expect(sliceTwo.get(store)).toEqual({
      keyTwo: 'valueTwo',
    });
  });
});

describe('StoreState', () => {
  describe('.resolve', () => {
    it('should return the slice state', () => {
      const sliceOneKey = sliceKey([], {
        name: 'sliceOne',
        state: {
          keyOne: 'valueOne',
        },
      });

      const sliceOne = slice([], {
        name: 'sliceOne',
        state: {
          keyOne: 'valueOne',
        },
      });

      const store = StoreState.create({
        slices: [sliceOne],
      });

      const sliceState = store.resolve(sliceOne.sliceId);

      expect(sliceState).toEqual({ keyOne: 'valueOne' });
    });

    it('should return the slice state with derived state if calcDerivedState is defined', () => {
      const sliceOneKey = sliceKey([], {
        name: 'sliceOne',
        state: {
          keyOne: 'valueOne',
        },
      });

      const selectorA = sliceOneKey.selector(
        (state) => {
          return 'derivedValue';
        },
        {
          equal: (a, b) => {
            return a === b;
          },
        },
      );

      const sliceOne = sliceOneKey.slice({
        derivedState: {
          selectorA,
        },
      });

      const store = StoreState.create({
        slices: [sliceOne],
      });

      const sliceState = store.resolve(sliceOne.sliceId);

      expect(sliceState).toEqual({
        keyOne: 'valueOne',
        selectorA: 'derivedValue',
      });

      const sliceStateWithoutDerived = store.resolve(sliceOne.sliceId, {
        skipDerivedData: true,
      });

      expect(sliceStateWithoutDerived).toEqual({
        keyOne: 'valueOne',
      });
    });

    it('should cache the result of calcDerivedState', () => {
      const sliceOneKey = sliceKey([], {
        name: 'sliceOne',
        state: {
          keyOne: 'valueOne',
        },
      });

      const selectorA = sliceOneKey.selector(
        (state) => {
          return 'derivedValue';
        },
        {
          equal: (a, b) => {
            return a === b;
          },
        },
      );

      const sliceOne = sliceOneKey.slice({
        derivedState: {
          selectorA,
        },
      });

      const store = StoreState.create({
        slices: [sliceOne],
      });

      const sliceState = store.resolve(sliceOne.sliceId);

      expect(sliceState).toEqual({
        keyOne: 'valueOne',
        selectorA: 'derivedValue',
      });

      // Call resolve again to ensure that the cached result is returned
      const sliceState2 = store.resolve(sliceOne.sliceId);

      expect(sliceState2).toBe(sliceState);
    });
  });
});

describe('_getChangedSlices', () => {
  test('returns an empty array when no transactions have been applied', () => {
    let storeState = StoreState.create({
      slices: [],
    });

    const changedSlices = storeState._getChangedSlices(
      StoreState.create({
        slices: [],
      }),
    );

    expect(changedSlices).toEqual([]);
  });

  test('should return changed slices', () => {
    let storeState1 = StoreState.create({
      slices: [sliceOne, sliceTwo],
    });

    let storeState2 = StoreState.create({
      slices: [sliceOne, sliceTwo],
    });

    // Apply transaction to the second store state
    const transaction = updateKeyTwoSliceTwo('updatedValueTwo');
    storeState2 = storeState2.applyTransaction(transaction);

    const changedSlices = storeState1._getChangedSlices(storeState2);

    // Only sliceTwo should have changed
    expect(changedSlices.length).toBe(1);
    expect(changedSlices[0]!.sliceId).toBe('sl_sliceTwo$');
  });

  test('should return empty array when no slices have changed', () => {
    let storeState1 = StoreState.create({
      slices: [sliceOne, sliceTwo],
    });

    let storeState2 = StoreState.create({
      slices: [sliceOne, sliceTwo],
    });

    const changedSlices = storeState1._getChangedSlices(storeState2);

    expect(changedSlices.length).toBe(0);
  });

  test('should return all slices when all slices have changed', () => {
    let initialStoreState = StoreState.create({
      slices: [sliceOne, sliceTwo],
    });

    // Apply transactions to the second store state
    const transactionOne = updateKeyOneSliceOne('updatedValueOne');
    const transactionTwo = updateKeyTwoSliceTwo('updatedValueTwo');
    let storeState = initialStoreState.applyTransaction(transactionOne);
    storeState = storeState.applyTransaction(transactionTwo);

    expect(storeState._getChangedSlices(initialStoreState)).toHaveLength(2);
    expect(initialStoreState._getChangedSlices(storeState)).toHaveLength(2);
  });
});

describe('simple action', () => {
  test('works', () => {
    const sliceTwo = slice([], {
      name: 'sliceTwo',
      state: { keyTwo: 'valueTwo' },
    });

    const sliceOne = slice([sliceTwo], {
      name: 'sliceOne',
      state: {
        keyOne: 'valueOne',
        keyTwo: false,
      },
    });

    const action1 = sliceOne.simpleAction('keyOne', (payload, state) => {
      expectType<string, typeof payload>(payload);

      expectType<StoreState<'sliceOne' | 'sliceTwo'>, typeof state>(state);

      return {
        keyOne: payload + 'abc',
      };
    });

    const action2: (val: boolean) => Transaction<'sliceOne'> =
      sliceOne.simpleAction('keyTwo');

    let store = StoreState.create({
      slices: [sliceTwo, sliceOne],
    });

    store = store.applyTransaction(action1('xyz'));

    expect(store.resolve(sliceOne.sliceId)).toEqual({
      keyOne: 'xyzabc',
      keyTwo: false,
    });

    store = store.applyTransaction(action2(true));

    expect(store.resolve(sliceOne.sliceId)).toEqual({
      keyOne: 'xyzabc',
      keyTwo: true,
    });
  });
});

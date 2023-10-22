import { IfEquals, expectType } from '../types';
import { slice, sliceKey } from '../slice';
import { StoreState, StoreStateKey } from '../store-state';
import { testCleanup } from '../helpers/test-cleanup';
import { Transaction } from '../transaction';
import { shallowEqual } from '../helpers';
import {
  calcSliceDerivedState,
  equalityGetValue,
  getValue,
} from '../slice/slice-key';

beforeEach(() => {
  testCleanup();
});

type InferSliceNameFromStoreState<TStoreState extends StoreState<any>> =
  TStoreState extends StoreState<infer T> ? T : never;

describe('sliceKey', () => {
  test('works with single slice', () => {
    const mySliceKeyA = sliceKey([], {
      name: 'mySliceA',
      state: {
        a: 1,
      },
    });

    const storeState = StoreState.create({
      slices: [mySliceKeyA.slice({ derivedState: {} })],
    });

    const selectorA = mySliceKeyA.selector((storeState) => {
      type SliceName = InferSliceNameFromStoreState<typeof storeState>;

      () => {
        let result: SliceName = {} as any;
        result = 'mySliceA';
        // @ts-expect-error not a dep
        result = 'mySliceB';
      };
      return { a: mySliceKeyA.get(storeState).a };
    });

    expect(selectorA(storeState)).toEqual({ a: 1 });
  });

  describe('works with slice and dep', () => {
    const mySliceKeyA = sliceKey([], {
      name: 'mySliceA',
      state: {
        a: 1,
      },
    });
    const mySliceA = mySliceKeyA.slice({ derivedState: {} });

    const mySliceKeyB = sliceKey([], {
      name: 'mySliceB',
      state: {
        a: 1,
      },
    });

    const mySliceB = mySliceKeyB.slice({ derivedState: {} });

    const mySliceKeyC = sliceKey([mySliceA], {
      name: 'mySliceC',
      state: {
        c: 15,
      },
    });
    const mySliceC = mySliceKeyC.slice({ derivedState: {} });

    const storeState = StoreState.create({
      slices: [
        mySliceKeyA.slice({ derivedState: {} }),
        mySliceKeyC.slice({ derivedState: {} }),
      ],
    });

    test('types are correct', () => {
      const cSelector = mySliceKeyC.selector((storeState) => {
        expectType<StoreState<'mySliceA' | 'mySliceC'>, typeof storeState>(
          storeState,
        );

        type SliceName = InferSliceNameFromStoreState<typeof storeState>;

        () => {
          let result: SliceName = {} as any;
          expectType<'mySliceA' | 'mySliceC', typeof result>(result);
          result = 'mySliceA';
          result = 'mySliceC';
          // @ts-expect-error should fail as mySliceB is not dep of C
          result = 'mySliceB';
        };
        () => {
          //   @ts-expect-error should fail as mySliceB is a dep
          mySliceKeyB.get(storeState);
          //   @ts-expect-error should fail as mySliceB is a dep
          mySliceB.get(storeState);
        };
        mySliceKeyA.get(storeState);
        mySliceKeyC.get(storeState);
        mySliceA.get(storeState);

        expect(mySliceA.get(storeState)).toEqual({ a: 1 });
        expect(mySliceKeyA.get(storeState)).toEqual({ a: 1 });

        expect(mySliceC.get(storeState)).toEqual({ c: 15 });
        expect(mySliceKeyC.get(storeState)).toEqual({ c: 15 });

        return {
          number: mySliceKeyC.get(storeState).c + mySliceA.get(storeState).a,
        };
      });

      expect(cSelector(storeState)).toEqual({ number: 16 });
    });
  });

  describe('equality', () => {
    const mySliceKeyA = sliceKey([], {
      name: 'mySliceA',
      state: {
        a: 1,
      },
    });

    test('returns same instance, when equal is true', () => {
      let calledTimes = 0;
      const selectorA = mySliceKeyA.selector(
        (storeState) => {
          calledTimes++;
          return { a: mySliceKeyA.get(storeState).a };
        },
        {
          equal: (a, b) => {
            expectType<{ a: number }, typeof a>(a);
            expectType<{ a: number }, typeof b>(b);
            return a.a === b.a;
          },
        },
      );
      const mySliceA = mySliceKeyA.slice({ derivedState: { selectorA } });
      const mySliceB = slice([], {
        name: 'mySliceB',
        state: {
          b: 1,
        },
      });

      const actionB = mySliceB.action(() => {
        return mySliceB.tx((storeState) =>
          mySliceB.update(storeState, { b: 2 }),
        );
      });

      const storeState = StoreState.create({
        slices: [mySliceB, mySliceA],
      });

      let originalValue = selectorA(storeState);
      expect(originalValue).toEqual({ a: 1 });

      const storeState2 = storeState.applyTransaction(actionB());

      expect(mySliceB.get(storeState2)).toEqual({ b: 2 });

      expect(mySliceA.get(storeState2).selectorA).toBe(
        mySliceA.get(storeState).selectorA,
      );

      expect(selectorA(storeState2)).toBe(originalValue);

      expect(calledTimes).toBe(2);
    });

    test('separately created stores states, should create new instance', () => {
      const storeState = StoreState.create({
        slices: [mySliceKeyA.slice({ derivedState: {} })],
      });
      let calledTimes = 0;
      const selectorA = mySliceKeyA.selector(
        (storeState) => {
          calledTimes++;
          return { a: mySliceKeyA.get(storeState).a };
        },
        {
          equal: (a, b) => {
            expectType<{ a: number }, typeof a>(a);
            expectType<{ a: number }, typeof b>(b);
            return a.a === b.a;
          },
        },
      );

      let originalValue = selectorA(storeState);
      expect(originalValue).toEqual({ a: 1 });

      const storeState2 = StoreState.create({
        slices: [mySliceKeyA.slice({ derivedState: {} })],
      });

      expect(selectorA(storeState2)).toEqual(originalValue);
      expect(selectorA(storeState2)).not.toBe(originalValue);

      expect(calledTimes).toBe(2);
    });

    test('equality returns false', () => {
      const storeState = StoreState.create({
        slices: [mySliceKeyA.slice({ derivedState: {} })],
      });
      let calledTimes = 0;

      const selectorA = mySliceKeyA.selector(
        (storeState) => {
          calledTimes++;

          return { a: mySliceKeyA.get(storeState).a };
        },
        {
          equal: (a, b) => a.a !== b.a,
        },
      );

      expect(selectorA(storeState)).toEqual({ a: 1 });

      const storeState2 = StoreState.create({
        slices: [mySliceKeyA.slice({ derivedState: {} })],
      });

      expect(selectorA(storeState2)).toEqual(selectorA(storeState));
      expect(selectorA(storeState2)).not.toBe(selectorA(storeState));
      expect(calledTimes).toBe(2);
    });
  });

  test('selector with empty state', () => {
    const mySliceKeyA = sliceKey([], {
      name: 'mySliceA',
      state: {},
    });

    const selectorA = mySliceKeyA.selector((storeState) => {
      return mySliceKeyA.get(storeState);
    });

    const mySliceA = mySliceKeyA.slice({
      derivedState: {
        selectorA,
      },
    });

    const storeState = StoreState.create({
      slices: [mySliceA],
    });

    expect(mySliceA.get(storeState).selectorA).toEqual({});
  });

  describe('slice with multiple dependencies', () => {
    const mySliceKeyA = sliceKey([], {
      name: 'mySliceA',
      state: { a: 2 },
    });

    let calledTimesA = 0;
    let calledTimesB = 0;
    let calledTimesC = 0;

    const selectorA = mySliceKeyA.selector(
      (storeState) => {
        calledTimesA++;
        return { selA: mySliceKeyA.get(storeState).a };
      },
      {
        equal: (a, b) => {
          return shallowEqual(a, b);
        },
      },
    );

    const mySliceA = mySliceKeyA.slice({ derivedState: { selectorA } });

    const mySliceKeyB = sliceKey([mySliceA], {
      name: 'mySliceB',
      state: { b: 5 },
    });

    const selectorB = mySliceKeyB.selector((storeState) => {
      calledTimesB++;
      return {
        selB: mySliceKeyB.get(storeState).b + mySliceA.get(storeState).a,
      };
    });

    const mySliceB = mySliceKeyB.slice({ derivedState: { selectorB } });

    const mySliceKeyC = sliceKey([mySliceA, mySliceB], {
      name: 'mySliceC',
      state: { c: 10 },
    });

    const selectorC = mySliceKeyC.selector((storeState) => {
      calledTimesC++;
      return {
        selCA: mySliceA.get(storeState).a,
        selCB: mySliceB.get(storeState).b,
        selCSelB: mySliceB.get(storeState).selectorB.selB,
        selC: mySliceKeyC.get(storeState).c,
      };
    });

    const mySliceC = mySliceKeyC.slice({ derivedState: { selectorC } });

    let incrementA: () => Transaction<'mySliceA'>;
    let incrementB: () => Transaction<'mySliceB'>;
    let incrementC: () => Transaction<'mySliceC'>;

    beforeEach(() => {
      calledTimesA = 0;
      calledTimesB = 0;
      calledTimesC = 0;
      incrementA = mySliceA.action(() => {
        return mySliceA.tx((storeState) =>
          mySliceKeyA.update(storeState, (obj) => ({ a: obj.a + 1 })),
        );
      });

      incrementB = mySliceB.action(() => {
        return mySliceB.tx((storeState) =>
          mySliceKeyB.update(storeState, (obj) => ({ b: obj.b + 1 })),
        );
      });

      incrementC = mySliceC.action(() => {
        return mySliceC.tx((storeState) =>
          mySliceC.update(storeState, (obj) => ({ c: obj.c + 1 })),
        );
      });
    });

    test('single A increment', () => {
      const storeState = StoreState.create({
        slices: [mySliceA, mySliceB, mySliceC],
      });
      const storeState2 = storeState.applyTransaction(incrementA());
      expect({
        sliceA: mySliceA.get(storeState2),
        sliceB: mySliceB.get(storeState2),
        sliceC: mySliceC.get(storeState2),
      }).toEqual({
        sliceA: {
          a: 3,
          selectorA: {
            selA: 3,
          },
        },
        sliceB: {
          b: 5,
          selectorB: {
            selB: 8,
          },
        },
        sliceC: {
          c: 10,
          selectorC: {
            selC: 10,
            selCB: 5,
            selCA: 3,
            selCSelB: 8,
          },
        },
      });

      // calling again should not call selector

      mySliceA.get(storeState2);
      mySliceB.get(storeState2);
      mySliceC.get(storeState2);

      expect(calledTimesA).toBe(1);
      expect(calledTimesB).toBe(1);
      expect(calledTimesC).toBe(1);
    });

    test('increment multiple should only call selector once', () => {
      const storeState = StoreState.create({
        slices: [mySliceA, mySliceB, mySliceC],
      });

      const storeState2 = storeState.applyTransaction(incrementA());

      let sliceAVal = mySliceA.get(storeState2).selectorA;
      expect(calledTimesA).toBe(1);

      mySliceB.get(storeState2);
      mySliceC.get(storeState2);

      expect(calledTimesA).toBe(1);

      let storeState3 = storeState2.applyTransaction(incrementC());

      expect(calledTimesA).toBe(1);

      expect(mySliceC.get(storeState3).selectorC).toMatchInlineSnapshot(`
        {
          "selC": 11,
          "selCA": 3,
          "selCB": 5,
          "selCSelB": 8,
        }
      `);
    });
  });
});

describe('calcDerivedState', () => {
  const setup = () => {
    // Initialize test data
    const mySliceKeyA = sliceKey([], {
      name: 'mySliceA',
      state: {
        foo: 'bar',
      },
    });

    const selectorA = mySliceKeyA.selector((storeState) => {
      return mySliceKeyA.get(storeState).foo.toUpperCase();
    });

    const mySliceA = mySliceKeyA.slice({
      derivedState: {
        selectorA,
      },
    });

    const storeState = StoreState.create({
      slices: [mySliceA],
    });

    const derivedEntries: [string, (state: StoreState<any>) => any][] = [
      ['selectorA', selectorA],
    ];

    const prevDerivedValueCache: WeakMap<
      StoreStateKey,
      Record<string, unknown>
    > = new WeakMap();

    return {
      prevDerivedValueCache,
      derivedEntries,
      storeState,
    };
  };

  it('should generate new derived state and set it in the cache if there is no previous derived state', () => {
    const { storeState, derivedEntries, prevDerivedValueCache } = setup();
    const derivedState = calcSliceDerivedState(
      storeState,
      derivedEntries,
      prevDerivedValueCache,
    );

    expect(derivedState).toEqual({
      selectorA: 'BAR',
    });

    expect(prevDerivedValueCache.get(storeState._storeStateKey)).toEqual(
      derivedState,
    );
  });

  it('should return previous derived state if it is shallowly equal to new derived state', () => {
    const { storeState, derivedEntries, prevDerivedValueCache } = setup();

    const initialDerivedState = {
      selectorA: 'BAR',
    };
    prevDerivedValueCache.set(storeState._storeStateKey, initialDerivedState);

    const derivedState = calcSliceDerivedState(
      storeState,
      derivedEntries,
      prevDerivedValueCache,
    );

    expect(derivedState).toBe(initialDerivedState);
  });

  it('should generate and return a new derived state if it is not shallowly equal to previous derived state', () => {
    const { storeState, derivedEntries, prevDerivedValueCache } = setup();

    const initialDerivedState = {
      selectorA: 'BAR_BAR',
    };
    prevDerivedValueCache.set(storeState._storeStateKey, initialDerivedState);

    const derivedState = calcSliceDerivedState(
      storeState,
      derivedEntries,
      prevDerivedValueCache,
    );

    expect(derivedState).not.toBe(initialDerivedState);
    expect(derivedState).toEqual({
      selectorA: 'BAR',
    });
    expect(prevDerivedValueCache.get(storeState._storeStateKey)).toEqual(
      derivedState,
    );
  });
});

describe('equalityGetValue/getValue function', () => {
  const setup = () => {
    // Initialize test data
    let mySliceKeyA = sliceKey([], {
      name: 'mySliceA',
      state: {
        foo: 'bar',
      },
    });

    let selectorACalled = { count: 0 };
    let selectorA = mySliceKeyA.selector((storeState: any) => {
      selectorACalled.count++;
      return mySliceKeyA.get(storeState).foo.toUpperCase();
    });

    let mySliceA = mySliceKeyA.slice({
      derivedState: {
        selectorA,
      },
    });

    let mockStoreState = StoreState.create({
      slices: [mySliceA],
    });

    let actionA = mySliceA.action((val = 'new val') => {
      return mySliceA.tx((storeState) =>
        mySliceA.update(storeState, { foo: val }),
      );
    });

    const valCache: WeakMap<StoreState<any>, unknown> = new WeakMap();
    const prevValCache: WeakMap<StoreStateKey, unknown> = new WeakMap();

    return {
      mockStoreState,
      selectorA,
      actionA,
      mySliceA,
      valCache,
      prevValCache,
      selectorACalled,
    };
  };

  describe('getValue', () => {
    test('works', () => {
      const { selectorACalled, mockStoreState, actionA, selectorA, valCache } =
        setup();

      const storeState2 = mockStoreState.applyTransaction(
        actionA('this is val2'),
      );

      expect(valCache.get(storeState2)).toBe(undefined);

      const result = getValue(storeState2, selectorA, valCache);

      expect(selectorACalled.count).toBe(1);
      expect(result).toBe('THIS IS VAL2');

      expect(valCache.get(storeState2)).toBe(result);

      getValue(storeState2, selectorA, valCache);

      expect(selectorACalled.count).toBe(1);
    });
  });

  describe('equalityGetValue', () => {
    it('should return the new value when the equality function returns false', () => {
      const { mockStoreState, actionA, selectorA, valCache, prevValCache } =
        setup();

      // provide a previous value
      prevValCache.set(mockStoreState._storeStateKey, 'OLD VAL');

      const mockEqualFn = jest.fn((a: any, b: any) => {
        return false;
      });

      const storeState2 = mockStoreState.applyTransaction(
        actionA('this is val2'),
      );

      const result = equalityGetValue(
        storeState2,
        selectorA,
        valCache,
        prevValCache,
        mockEqualFn,
      );

      expect(mockEqualFn).toBeCalledTimes(1);
      expect(mockEqualFn).nthCalledWith(1, 'THIS IS VAL2', 'OLD VAL');
      expect(result).toBe('THIS IS VAL2');

      expect(valCache.get(storeState2)).toBe('THIS IS VAL2');
      expect(prevValCache.get(mockStoreState._storeStateKey)).toBe(
        'THIS IS VAL2',
      );
    });

    it('should return the old value when the equality function returns true', () => {
      const { mockStoreState, actionA, selectorA, valCache, prevValCache } =
        setup();

      // provide a previous value
      prevValCache.set(mockStoreState._storeStateKey, 'OLD VAL');

      const mockEqualFn = jest.fn((a: any, b: any) => {
        return true;
      });

      const storeState2 = mockStoreState.applyTransaction(
        actionA('this is val2'),
      );

      let result = equalityGetValue(
        storeState2,
        selectorA,
        valCache,
        prevValCache,
        mockEqualFn,
      );

      expect(mockEqualFn).toBeCalledTimes(1);
      expect(mockEqualFn).nthCalledWith(1, 'THIS IS VAL2', 'OLD VAL');
      expect(result).toBe('OLD VAL');
      expect(prevValCache.get(mockStoreState._storeStateKey)).toBe('OLD VAL');
      expect(valCache.get(storeState2)).toBe('OLD VAL');

      //  calling again should not call selector or equality function
      result = equalityGetValue(
        storeState2,
        selectorA,
        valCache,
        prevValCache,
        mockEqualFn,
      );
      expect(mockEqualFn).toBeCalledTimes(1);
    });
  });
});

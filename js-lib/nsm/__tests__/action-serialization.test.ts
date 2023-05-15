import { createSlice, Store, Transaction } from 'nalanda';
import { z } from 'zod';

import {
  payloadParser,
  payloadSerializer,
  serialAction,
  validateSlicesForSerialization,
} from '../action-serialization';
import { zodFindUnsafeTypes } from '../zod-helpers';

type AnyTransaction = Transaction<any, any[]>;

describe('zodFindUnsafeTypes', () => {
  test('catches functions', () => {
    const schema = z.object({
      a: z.function().optional(),
    });

    expect(zodFindUnsafeTypes(schema)).toEqual(['ZodFunction']);

    expect(
      zodFindUnsafeTypes(
        z.object({
          a: z.function().nullable(),
        }),
      ),
    ).toEqual(['ZodFunction']);

    expect(
      zodFindUnsafeTypes(
        z.object({
          foo: z.object({
            foo: z.object({
              a: z.function().nullable(),
            }),
          }),
        }),
      ),
    ).toEqual(['ZodFunction']);
  });

  test('works', () => {
    expect(
      zodFindUnsafeTypes(
        z.object({
          a: z.record(z.number()),
        }),
      ),
    ).toEqual([]);

    expect(
      zodFindUnsafeTypes(
        z.object({
          a: z.record(z.number()),
        }),
      ),
    ).toEqual([]);
  });

  test('works with action', () => {
    expect(() =>
      createSlice([], {
        name: 'ji',
        initState: {},
        actions: {
          myAction1: serialAction(
            z.object({
              number: z.number(),
              key: z.string(),
              map: z.any(),
            }),
            (payload) => (state) => state,
          ),
        },
      }),
    ).toThrowError(`serialAction: schema contains unsafe types: ZodAny`);
  });

  test('works with nativeEnum 1', () => {
    enum Fruits {
      Apple,
      Banana,
    }
    const FruitEnum = z.nativeEnum(Fruits);
    expect(zodFindUnsafeTypes(FruitEnum)).toEqual([]);
  });

  test('nativeEnum: throws error works with boolean', () => {
    const MyObj = {
      Apple: 'apple',
      Banana: false,
    } as const;

    // @ts-expect-error
    expect(zodFindUnsafeTypes(z.nativeEnum(MyObj))).toEqual([
      'ZodNativeEnum: for Banana only supports string, number and boolean',
    ]);
  });
});

describe('validateSlicesForSerialization', () => {
  test('works', () => {
    const slice1 = createSlice([], {
      name: 'ji',
      initState: {},
      actions: {
        myAction1: serialAction(
          z.object({
            number: z.number(),
            key: z.string(),
            map: z.record(z.number()),
          }),
          (payload) => (state) => state,
        ),
        myAction2: (payload) => (state) => state,
      },
    });

    const slice2 = createSlice([], {
      name: 'slice2',
      initState: {},
      actions: {
        myAction1: (payload) => (state) => state,
        myAction2: (payload) => (state) => state,
      },
    });

    expect(() =>
      validateSlicesForSerialization([slice1]),
    ).toThrowErrorMatchingInlineSnapshot(
      `"validateSlices: slice ji is using an action myAction2 that does not have serialization setup"`,
    );
    expect(() => validateSlicesForSerialization([slice2])).toThrowError();
  });
});

describe('serializing transaction', () => {
  const testSlice1 = createSlice([], {
    name: 'test-slice-1',
    initState: {
      counter: 0,
    },
    actions: {
      myAction1: serialAction(
        z.object({
          number: z.number(),
          key: z.string(),
          map: z.record(z.number()),
        }),
        (payload) => (state) => ({
          ...state,
          counter: state.counter + payload.number,
        }),
      ),
    },
  });

  const testSlice2 = createSlice([], {
    name: 'test-slice-2',
    initState: {
      counter: 0,
      map: new Map(),
    },
    actions: {
      myAction1: serialAction(
        z.object({
          travel: z.map(z.string(), z.number()),
        }),
        (payload) => (state) => ({
          ...state,
          counter: [...payload.travel.values()].reduce(
            (a, b) => a + b,
            state.counter,
          ),
          map: payload.travel,
        }),
      ),
    },
  });

  test('works', () => {
    const store = Store.create({
      storeName: 'test-store',
      state: [testSlice1],
    }) as Store;

    const tx = testSlice1.actions.myAction1({ number: 5, key: 'a', map: {} });
    store.dispatch(tx);

    expect(testSlice1.getState(store.state)).toEqual({
      counter: 5,
    });

    const jsonTxn = tx.toJSONObj(store, payloadSerializer);

    expect(payloadSerializer(tx.payload, tx)).toMatchInlineSnapshot(
      `"{"json":[{"number":5,"key":"a","map":{}}]}"`,
    );

    const store2 = Store.create({
      storeName: 'test-store2',
      state: [testSlice1],
    }) as Store;

    const parsedTx = Transaction.fromJSONObj(store2, jsonTxn, payloadParser);

    expect(testSlice1.getState(store2.state)).toEqual({
      counter: 0,
    });

    let newState2 = store2.state.applyTransaction(parsedTx);

    expect(testSlice1.getState(newState2)).toEqual({
      counter: 5,
    });
  });

  test('works with map', () => {
    const store = Store.create({
      storeName: 'test-store',
      state: [testSlice2],
    }) as Store;

    const tx = testSlice2.actions.myAction1({
      travel: new Map([
        ['a', 1],
        ['b', 5],
      ]),
    });

    store.dispatch(tx);

    expect(testSlice2.getState(store.state)).toEqual({
      counter: 6,
      map: new Map([
        ['a', 1],
        ['b', 5],
      ]),
    });

    const jsonTxn = tx.toJSONObj(store, payloadSerializer);

    expect(jsonTxn).toMatchInlineSnapshot(
      {
        uid: expect.any(String),
      },
      `
      {
        "actionId": "myAction1",
        "metadata": {
          "TX_META_STORE_NAME": "test-store",
        },
        "payload": "{"json":[{"travel":[["a",1],["b",5]]}],"meta":{"values":{"0.travel":["map"]}}}",
        "sourceSliceId": "test-slice-2",
        "sourceSliceName": "test-slice-2",
        "targetSliceId": "test-slice-2",
        "uid": Any<String>,
      }
    `,
    );

    const store2 = Store.create({
      storeName: 'test-store2',
      state: [testSlice2],
    }) as Store;

    const parsedTx = Transaction.fromJSONObj(store2, jsonTxn, payloadParser);

    expect(testSlice2.getState(store2.state)).toEqual({
      counter: 0,
      map: new Map(),
    });

    let newState2 = store2.state.applyTransaction(parsedTx as any);

    expect(testSlice2.getState(newState2)).toEqual({
      counter: 6,
      map: new Map([
        ['a', 1],
        ['b', 5],
      ]),
    });
  });

  test('multiple slices', () => {
    let dispatchedTx: Array<Transaction<any, any>> = [];
    const store = Store.create({
      storeName: 'test-store',
      state: [testSlice1, testSlice2],
      dispatchTx: (store, _tx) => {
        dispatchedTx.push(_tx);
        let newState = store.state.applyTransaction(_tx);
        Store.updateState(store, newState, _tx);
      },
    }) as Store;

    store.dispatch(
      testSlice1.actions.myAction1({
        number: 5,
        key: 'a',
        map: {},
      }),
    );
    store.dispatch(
      testSlice2.actions.myAction1({
        travel: new Map([['foo', 1]]),
      }),
    );

    store.dispatch(
      testSlice1.actions.myAction1({
        number: 5,
        key: 'f',
        map: {
          a: 1,
        },
      }),
    );

    store.dispatch(
      testSlice2.actions.myAction1({
        travel: new Map([
          ['foo', 1],
          ['bar', 2],
        ]),
      }),
    );

    const store2 = Store.create({
      storeName: 'test-store2',
      state: [testSlice1, testSlice2],
      dispatchTx: (store, _tx) => {
        let newState = store.state.applyTransaction(_tx);

        Store.updateState(store, newState, _tx);
      },
    }) as Store;

    for (const serializedTx of dispatchedTx.map((t) =>
      t.toJSONObj(store, payloadSerializer),
    )) {
      const parsedTx = Transaction.fromJSONObj(
        store2,
        serializedTx,
        payloadParser,
      );

      store2.dispatch(parsedTx);
    }

    expect(testSlice1.getState(store2.state)).toEqual({
      counter: 10,
    });
    expect(testSlice1.getState(store2.state)).toEqual(
      testSlice1.getState(store.state),
    );

    expect(testSlice2.getState(store2.state)).toMatchInlineSnapshot(`
      {
        "counter": 4,
        "map": Map {
          "foo" => 1,
          "bar" => 2,
        },
      }
    `);
    expect(testSlice2.getState(store2.state)).toEqual(
      testSlice2.getState(store.state),
    );
  });
});

import type { Transaction } from 'nalanda';
import { createSlice, Store } from 'nalanda';
import { z } from 'zod';

import {
  deserializeTransaction,
  serialAction,
  serializeTransaction,
  validateSlicesForSerialization,
} from '../serialization';
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
        selectors: {},
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
});

describe('validateSlicesForSerialization', () => {
  test('works', () => {
    const slice = createSlice([], {
      name: 'ji',
      initState: {},
      selectors: {},
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

    expect(() =>
      validateSlicesForSerialization([slice]),
    ).toThrowErrorMatchingInlineSnapshot(
      `"validateSlices: slice ji is using an action myAction2 that is not serializable"`,
    );
  });
});

describe('serializing transaction', () => {
  const testSlice1 = createSlice([], {
    name: 'test-slice-1',
    initState: {
      counter: 0,
    },
    selectors: {},
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
    },
    selectors: {},
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
        }),
      ),
    },
  });

  test('works', () => {
    let tx: AnyTransaction | null = null;

    const store = Store.create({
      storeName: 'test-store',
      state: [testSlice1],
      dispatchTx: (store, _tx) => {
        tx = _tx;

        let newState = store.state.applyTransaction(_tx);

        store.updateState(newState, _tx);
      },
    });

    store.dispatch(
      testSlice1.actions.myAction1({ number: 5, key: 'a', map: {} }),
    );

    expect(testSlice1.getState(store.state)).toEqual({
      counter: 5,
    });

    const store2 = Store.create({
      storeName: 'test-store2',
      state: [testSlice1],
    });

    expect(serializeTransaction(tx!, store2)).toMatchInlineSnapshot(
      {
        metadata: {
          'store-tx-id': expect.any(String),
        },
        uid: expect.any(String),
      },
      `
      {
        "actionId": "myAction1",
        "metadata": {
          "store-name": "test-store",
          "store-tx-id": Any<String>,
        },
        "payload": "{"json":[{"number":5,"key":"a","map":{}}]}",
        "sourceSliceKey": "key_test-slice-1",
        "sourceSliceName": "test-slice-1",
        "targetSliceKey": "key_test-slice-1",
        "targetSliceName": "test-slice-1",
        "uid": Any<String>,
      }
    `,
    );

    const parsedTx = deserializeTransaction(
      serializeTransaction(tx!, store2),
      store,
    );

    expect(testSlice1.getState(store2.state)).toEqual({
      counter: 0,
    });

    let newState2 = store2.state.applyTransaction(parsedTx as any);

    expect(testSlice1.getState(newState2)).toEqual({
      counter: 5,
    });
  });

  test('works with map', () => {
    let tx: AnyTransaction | null = null;

    const store = Store.create({
      storeName: 'test-store',
      state: [testSlice2],
      dispatchTx: (store, _tx) => {
        tx = _tx;

        let newState = store.state.applyTransaction(_tx);

        store.updateState(newState, _tx);
      },
    });

    store.dispatch(
      testSlice2.actions.myAction1({
        travel: new Map([
          ['a', 1],
          ['b', 5],
        ]),
      }),
    );

    expect(testSlice2.getState(store.state)).toEqual({
      counter: 6,
    });

    expect(serializeTransaction(tx!, store)).toMatchInlineSnapshot(
      {
        metadata: {
          'store-tx-id': expect.any(String),
        },
        uid: expect.any(String),
      },
      `
      {
        "actionId": "myAction1",
        "metadata": {
          "store-name": "test-store",
          "store-tx-id": Any<String>,
        },
        "payload": "{"json":[{"travel":[["a",1],["b",5]]}],"meta":{"values":{"0.travel":["map"]}}}",
        "sourceSliceKey": "key_test-slice-2",
        "sourceSliceName": "test-slice-2",
        "targetSliceKey": "key_test-slice-2",
        "targetSliceName": "test-slice-2",
        "uid": Any<String>,
      }
    `,
    );

    const store2 = Store.create({
      storeName: 'test-store2',
      state: [testSlice2],
    });

    const parsedTx = deserializeTransaction(
      serializeTransaction(tx!, store2),
      store,
    );

    expect(testSlice2.getState(store2.state)).toEqual({
      counter: 0,
    });

    let newState2 = store2.state.applyTransaction(parsedTx as any);

    expect(testSlice2.getState(newState2)).toEqual({
      counter: 6,
    });
  });

  test('throws error', () => {
    let tx: AnyTransaction | null = null;

    const myTestSlice = createSlice([], {
      name: 'myTestSlice',
      initState: {
        counter: 0,
      },
      selectors: {},
      actions: {
        myAction1: (payload: { number: number }) => (state) => ({
          ...state,
          counter: state.counter + payload.number,
        }),
      },
    });

    const store = Store.create({
      storeName: 'test-store',
      state: [myTestSlice],
      dispatchTx: (store, _tx) => {
        tx = _tx;

        let newState = store.state.applyTransaction(_tx);

        store.updateState(newState, _tx);
      },
    });

    store.dispatch(myTestSlice.actions.myAction1({ number: 3 }));

    expect(myTestSlice.getState(store.state)).toEqual({
      counter: 3,
    });

    expect(() =>
      serializeTransaction(tx!, store),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Unable to serialize action with id "myAction1" in slice "key_myTestSlice", did you forget to use serialAction?"`,
    );
  });
});

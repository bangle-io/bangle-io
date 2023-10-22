import { expectType } from '../types';
import { slice } from '../slice';
import { Transaction } from '../transaction';
import { Action, ActionBuilder } from '../action';
import { idGeneration } from '../helpers';
import { StoreState } from '../store-state';
import { testCleanup } from '../helpers/test-cleanup';

afterEach(() => {
  testCleanup();
});

describe('action type', () => {
  const mySlice = slice([], {
    name: 'mySlice',
    state: {
      a: 1,
    },
  });

  test('setup', () => {
    let myAction = mySlice.action((a: number) => {
      return mySlice.tx((state) => {
        return mySlice.update(state, { a: 3 });
      });
    });

    expectType<(a: number) => Transaction<'mySlice'>, typeof myAction>(
      myAction,
    );

    const txn = myAction(3);
    expectType<Transaction<'mySlice'>, typeof txn>(txn);

    expect(txn).toMatchInlineSnapshot(`
      Transaction {
        "destroyed": false,
        "metadata": Metadata {
          "_metadata": {},
        },
        "opts": {},
        "steps": [
          {
            "actionId": "a_[sl_mySlice$]",
            "params": [
              3,
            ],
            "sourceSliceId": "sl_mySlice$",
            "sourceSliceName": "mySlice",
            "targetSliceId": "sl_mySlice$",
            "targetSliceName": "mySlice",
          },
        ],
        "txId": "tx_0",
      }
    `);
  });

  test('action naming', () => {
    let myAction1 = mySlice.action(function myActioning(a: number) {
      return mySlice.tx((state) => {
        return mySlice.update(state, { a: 3 });
      });
    });

    let myAction2 = mySlice.action((a: number) => {
      return mySlice.tx((state) => {
        return mySlice.update(state, { a: 3 });
      });
    });

    expect(myAction1(3).steps[0]!.actionId).toContain(
      'a_myActioning[sl_mySlice',
    );

    expect(myAction2(3).steps[0]!.actionId).toEqual('a_[sl_mySlice$]0');
  });

  test('same hint', () => {
    const sliceJackson = slice([], {
      name: 'sliceJackson',
      state: {
        a: 1,
      },
    });

    let myAction1 = sliceJackson.action(function myActioning(a: number) {
      return sliceJackson.tx((state) => {
        return sliceJackson.update(state, { a: 3 });
      });
    });

    let myAction2 = sliceJackson.action(function myActioning(a: number) {
      return sliceJackson.tx((state) => {
        return sliceJackson.update(state, { a: 3 });
      });
    });

    expect(myAction1(3).steps[0]?.actionId).toEqual(
      'a_myActioning[sl_sliceJackson$]',
    );
    expect(myAction2(3).steps[0]?.actionId).toEqual(
      'a_myActioning[sl_sliceJackson$]0',
    );
  });

  test('types', () => {
    let stateBuilder = mySlice.tx((state) => {
      return mySlice.update(state, { a: 3 });
    });

    expectType<ActionBuilder<'mySlice', never>, typeof stateBuilder>(
      stateBuilder,
    );
  });

  test('types when slice has dep', () => {
    const mySlice0 = slice([mySlice], {
      name: 'mySlice0',
      state: {
        a: 1,
      },
    });

    const mySlice2 = slice([mySlice, mySlice0], {
      name: 'mySlice2',
      state: {
        a: 1,
      },
    });

    let stateBuilder = mySlice2.tx((state) => {
      return mySlice2.update(state, { a: 3 });
    });

    expectType<
      ActionBuilder<'mySlice2', 'mySlice' | 'mySlice0'>,
      typeof stateBuilder
    >(stateBuilder);
  });
});

describe('Action', () => {
  let mySlice = slice([], {
    name: 'test',
    state: {
      z: -1,
      a: 0,
    },
  });

  test('constructor sets actionId and registers action', () => {
    const actionUpdateTo3 = mySlice.action(
      (
        a: number,
        config: {
          opt1: string;
        },
      ) => {
        return mySlice.tx((state) => {
          return mySlice.update(state, { a: 3 });
        });
      },
    );

    const txn = actionUpdateTo3(4, { opt1: 'hi' });
    expect(txn).toMatchInlineSnapshot(`
      Transaction {
        "destroyed": false,
        "metadata": Metadata {
          "_metadata": {},
        },
        "opts": {},
        "steps": [
          {
            "actionId": "a_[sl_test$]",
            "params": [
              4,
              {
                "opt1": "hi",
              },
            ],
            "sourceSliceId": "sl_test$",
            "sourceSliceName": "test",
            "targetSliceId": "sl_test$",
            "targetSliceName": "test",
          },
        ],
        "txId": "tx_0",
      }
    `);

    const storeState = StoreState.create({ slices: [mySlice] });

    expect(Action._applyStep(storeState, txn.steps[0]!)).toEqual({
      a: 3,
      z: -1,
    });
  });

  test('using function for updating state works', () => {
    const actionIncrement = mySlice.action(
      (
        a: number,
        config: {
          opt1: string;
        },
      ) => {
        return mySlice.tx((state) => {
          return mySlice.update(state, (existing) => ({ a: existing.a + 1 }));
        });
      },
    );

    const txn = actionIncrement(4, { opt1: 'hi' });
    const storeState = StoreState.create({ slices: [mySlice] });

    expect(Action._applyStep(storeState, txn.steps[0]!)).toEqual({
      a: 1,
      z: -1,
    });
  });

  test('throws error if action id is not found', () => {
    const actionIncrement = mySlice.action(
      (
        a: number,
        config: {
          opt1: string;
        },
      ) => {
        return mySlice.tx((state) => {
          return mySlice.update(state, (existing) => ({ a: existing.a + 1 }));
        });
      },
    );

    const txn = actionIncrement(4, { opt1: 'hi' });
    const storeState = StoreState.create({ slices: [mySlice] });

    expect(() => {
      Action._applyStep(storeState, {
        actionId: idGeneration.createActionId(mySlice.sliceId),
        params: [],
        sourceSliceId: mySlice.sliceId,
        targetSliceId: mySlice.sliceId,
        sourceSliceName: mySlice.name,
        targetSliceName: mySlice.name,
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"ActionId "a_[sl_test$]0" for Slice "sl_test$" does not exist"`,
    );
  });
});

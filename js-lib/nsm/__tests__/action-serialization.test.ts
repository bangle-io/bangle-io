import { z } from 'zod';

import { serialAction } from '../action-serializer';
import { expectType, Transaction } from '../common';
import { slice } from '../create';

test('checks work', () => {
  let case1 = slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
    actions: {
      nonSerial: (payload: string) => (state) => state,
      serial: serialAction(z.string(), (payload: string) => (state) => state),
    },
  });

  expect(case1._actionSerializer.isSyncReady()).toBe(false);

  let case2 = slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
    actions: {
      serial: serialAction(z.string(), (payload) => (state) => state),
    },
  });

  expect(case2._actionSerializer.isSyncReady()).toBe(true);

  let case3 = slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
    actions: {},
  });

  expect(case3._actionSerializer.isSyncReady()).toBe(true);

  let case4 = slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
  });

  expect(case4._actionSerializer.isSyncReady()).toBe(true);

  let case5 = slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
    actions: {
      serial: serialAction(z.string(), (payload) => (state) => state),
      serial2: serialAction(z.string(), (payload) => (state) => state),
    },
  });

  expect(case5._actionSerializer.isSyncReady()).toBe(true);
});

test('typing is correct', () => {
  slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
    actions: {
      serial: serialAction(z.string(), (payload) => {
        // @ts-expect-error payload should not be any
        let testVal0 = payload.xyzTest;

        expectType<string>(payload);

        return (state) => {
          // @ts-expect-error state should not be any
          let testVal1 = state.xyzTest;

          expectType<{ magic: number }>(state);

          return state;
        };
      }),

      serial2: serialAction(
        z.string(),
        (payload) => (state) =>
          // @ts-expect-error returning null should error
          null,
      ),
    },
  });
});

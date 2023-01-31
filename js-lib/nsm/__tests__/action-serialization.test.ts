import { z } from 'zod';

import type { Transaction } from '../common';
import { mySerialAction, RawAction, RawJsAction } from '../common';
import { slice } from '../create';
import type { Slice } from '../slice';

export type SerialAction2<K extends string, T extends z.ZodTypeAny> = {
  schema: T;
  action: (payload: z.infer<T>) => Transaction<K, z.infer<T>>;
};

test('checks work', () => {
  let case1 = slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
    actions: {
      nonSerial: (payload: string) => (state) => state,
      serial: mySerialAction(z.string(), (payload: string) => (state) => state),
    },
  });

  expect(case1._isSyncReady()).toBe(false);

  let case2 = slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
    actions: {
      serial: mySerialAction(z.string(), (payload) => (state) => state),
    },
  });

  expect(case2._isSyncReady()).toBe(true);

  let case3 = slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
    actions: {},
  });

  expect(case3._isSyncReady()).toBe(true);

  let case4 = slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
  });

  expect(case4._isSyncReady()).toBe(true);

  let case5 = slice({
    key: 'ji',
    initState: {
      magic: 3,
    },
    actions: {
      serial: mySerialAction(z.string(), (payload) => (state) => state),
      serial2: mySerialAction(z.string(), (payload) => (state) => state),
    },
  });

  expect(case5._isSyncReady()).toBe(true);
});

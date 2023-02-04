import { z } from 'zod';

import { serialAction } from '../action-serializer';
import { expectType } from '../common';
import { key, slice } from '../create';
import { zodFindUnsafeTypes } from '../zod';

test('checks work', () => {
  let case1 = slice({
    key: key('ji', [], {
      magic: 3,
    }),
    actions: {
      nonSerial: (payload: string) => (state) => state,
      serial: serialAction(z.string(), (payload: string) => (state) => state),
    },
  });

  expect(case1._actionSerializer.isSyncReady()).toBe(false);

  let case2 = slice({
    key: key('ji', [], {
      magic: 3,
    }),
    actions: {
      serial: serialAction(z.string(), (payload) => (state) => state),
    },
  });

  expect(case2._actionSerializer.isSyncReady()).toBe(true);

  let case3 = slice({
    key: key('ji', [], {
      magic: 3,
    }),
    actions: {},
  });

  expect(case3._actionSerializer.isSyncReady()).toBe(true);

  let case4 = slice({
    key: key('ji', [], {
      magic: 3,
    }),
    actions: {},
  });

  expect(case4._actionSerializer.isSyncReady()).toBe(true);

  let case5 = slice({
    key: key('ji', [], {
      magic: 3,
    }),
    actions: {
      serial: serialAction(z.string(), (payload) => (state) => state),
      serial2: serialAction(z.string(), (payload) => (state) => state),
    },
  });

  expect(case5._actionSerializer.isSyncReady()).toBe(true);
});

test('typing is correct', () => {
  slice({
    key: key('ji', [], {
      magic: 3,
    }),
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

test('serialization works', () => {
  let mySlice = slice({
    key: key('ji', [], {
      magic: 3,
    }),
    actions: {
      myAction1: serialAction(
        z.object({
          number: z.number(),
          key: z.string(),
          map: z.map(z.string(), z.number()),
        }),
        (payload) => (state) => state,
        {
          serialize: (schema, [payload]) => {
            return JSON.stringify({
              number: payload.number,
              key: payload.key,
              map: Array.from(payload.map),
            });
          },
          parse: (schema, str) => {
            if (typeof str !== 'string') {
              throw new Error('In parse expected string type');
            }
            let obj = JSON.parse(str);

            return [
              {
                number: obj.number,
                key: obj.key,
                map: new Map<string, number>(obj.map),
              },
            ];
          },
        },
      ),

      myAction2: serialAction(z.boolean(), (payload) => (state) => state, {
        serialize: (schema, [payload]) => {
          return JSON.stringify(payload);
        },
        parse: (schema, str) => {
          if (typeof str !== 'string') {
            throw new Error('In parse expected string type');
          }
          let obj = JSON.parse(str);

          return [obj];
        },
      }),
    },
  });

  const val1 = {
    number: 3,
    key: 'key',
    map: new Map([['key', 3]]),
  };

  let serial1 = mySlice._actionSerializer.serializeActionPayload('myAction1', [
    val1,
  ]);

  expect(serial1).toMatchInlineSnapshot(
    `"{"number":3,"key":"key","map":[["key",3]]}"`,
  );

  expect(
    mySlice._actionSerializer.parseActionPayload('myAction1', serial1),
  ).toEqual([val1]);

  let serial2 = mySlice._actionSerializer.serializeActionPayload('myAction2', [
    false,
  ]);

  expect(serial2).toMatchInlineSnapshot(`"false"`);

  expect(
    mySlice._actionSerializer.parseActionPayload('myAction2', serial2),
  ).toEqual([false]);
});

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
      slice({
        key: key('ji', [], {
          magic: 3,
        }),
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

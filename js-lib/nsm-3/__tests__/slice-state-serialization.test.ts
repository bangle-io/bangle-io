import { slice } from '../old-nalanda/src/index';
import { z } from 'zod';

import { sliceStateSerializer } from '../slice-state-serialization';

const expectType = <Type>(_: Type): void => void 0;

test('work with serializable data', () => {
  const testSlice1 = slice([], {
    name: 'test-slice-1',
    state: {
      counter: 0,
      veggie: {
        items: ['carrot', 'potato'],
      },
    },
  });

  sliceStateSerializer(testSlice1, {
    dbKey: 'uid',
    schema: z.object({
      counter: z.number(),
      veggie: z.object({
        items: z.array(z.string()),
      }),
    }),
    serialize: (state) => {
      const { counter, veggie } = testSlice1.get(state);

      expectType<number>(counter);
      expectType<{
        items: string[];
      }>(veggie);

      return {
        version: 1,
        data: { counter, veggie },
      };
    },
    deserialize: ({ version, data }) => {
      expectType<number>(version);

      return data;
    },
  });
});

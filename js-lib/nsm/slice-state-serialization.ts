import type {
  AnySlice,
  InferSliceName,
  Slice,
  StoreState,
  ValidStoreState,
} from 'nalanda';
import * as superjson from 'superjson';
import type { SuperJSONResult } from 'superjson/dist/types';
import type { z } from 'zod';

import { assertSafeZodSchema } from './zod-helpers';

export type SliceStateSerialData = Record<string, SuperJSONResult>;

export type InferSliceState<T> = T extends Slice<any, infer TState, any, any>
  ? TState
  : never;

type SliceData<TSchema extends z.ZodTypeAny> = {
  version: number;
  data: z.infer<TSchema>;
};

export interface SliceStateSerializer<
  TSlice extends AnySlice,
  TSchema extends z.ZodTypeAny,
> {
  dbKey: string;
  schema: TSchema;
  serialize: (state: StoreState<InferSliceName<TSlice>>) => SliceData<TSchema>;
  deserialize: (param: SliceData<TSchema>) => InferSliceState<TSlice>;
}

export function sliceStateSerializer<
  TSlice extends AnySlice,
  TSchema extends z.ZodTypeAny,
>(
  slice: TSlice,
  {
    dbKey,
    schema,
    serialize,
    deserialize,
  }: SliceStateSerializer<TSlice, TSchema>,
) {
  assertSafeZodSchema(schema);

  return {
    populate: <TStoreSliceNames extends string>(
      state: ValidStoreState<TStoreSliceNames, InferSliceName<TSlice>>,
      db: SliceStateSerialData,
    ) => {
      const data = serialize(state as StoreState<any>);

      if (db[dbKey] !== undefined) {
        throw new Error(`DB key "${dbKey}" already exists, it must be unique`);
      }

      db[dbKey] = superjson.serialize(data);
    },
    retrieve: (data: SliceStateSerialData): InferSliceState<TSlice> => {
      const dbData = data[dbKey];

      if (dbData === undefined) {
        return slice.spec.initState;
      }

      const parsedObject: SliceData<any> = superjson.deserialize(dbData);

      if (typeof parsedObject.version !== 'number') {
        console.error('Version number is not a number');

        return slice.spec.initState;
      }

      const result = schema.safeParse(parsedObject.data);

      if (!result.success) {
        console.error(result.error);

        return slice.spec.initState;
      }

      return deserialize({
        version: parsedObject.version,
        data: result.data,
      });
    },
  };
}

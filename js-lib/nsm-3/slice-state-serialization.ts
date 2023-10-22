import type {
  BaseSlice,
  InferSliceNameFromSlice,
  StoreState,
  ValidStoreState,
} from './old-nalanda/src/index';
import * as superjson from 'superjson';
import type { SuperJSONResult } from 'superjson/dist/types';
import type { z } from 'zod';

import { assertSafeZodSchema } from './zod-helpers';

export type SliceStateSerialData = Record<string, SuperJSONResult>;

export type InferSliceState<T> = T extends BaseSlice<any, infer TState, any>
  ? TState
  : never;

type SliceData<TSchema extends z.ZodTypeAny> = {
  version: number;
  data: z.infer<TSchema>;
};

export interface SliceStateSerializer<
  TBaseSlice extends BaseSlice<any, any, any>,
  TSchema extends z.ZodTypeAny,
> {
  dbKey: string;
  schema: TSchema;
  serialize: (
    state: StoreState<InferSliceNameFromSlice<TBaseSlice>>,
  ) => SliceData<TSchema>;
  deserialize: (param: SliceData<TSchema>) => InferSliceState<TBaseSlice>;
}

export function sliceStateSerializer<
  TBaseSlice extends BaseSlice<any, any, any>,
  TSchema extends z.ZodTypeAny,
>(
  slice: TBaseSlice,
  {
    dbKey,
    schema,
    serialize,
    deserialize,
  }: SliceStateSerializer<TBaseSlice, TSchema>,
) {
  assertSafeZodSchema(schema);

  return {
    populate: <TStoreSliceNames extends string>(
      state: ValidStoreState<
        TStoreSliceNames,
        InferSliceNameFromSlice<TBaseSlice>
      >,
      db: SliceStateSerialData,
    ) => {
      const data = serialize(state as StoreState<any>);

      if (db[dbKey] !== undefined) {
        throw new Error(`DB key "${dbKey}" already exists, it must be unique`);
      }

      db[dbKey] = superjson.serialize(data);
    },
    retrieve: (data: SliceStateSerialData): InferSliceState<TBaseSlice> => {
      const dbData = data[dbKey];

      if (dbData === undefined) {
        return slice.initialState;
      }

      const parsedObject: SliceData<any> = superjson.deserialize(dbData);

      if (typeof parsedObject.version !== 'number') {
        console.error('Version number is not a number');

        return slice.initialState;
      }

      const result = schema.safeParse(parsedObject.data);

      if (!result.success) {
        console.error(result.error);

        return slice.initialState;
      }

      return deserialize({
        version: parsedObject.version,
        data: result.data,
      });
    },
  };
}

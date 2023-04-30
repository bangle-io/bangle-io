import type {
  ActionBuilder,
  AnySlice,
  LineageId,
  PayloadParser,
  PayloadSerializer,
} from 'nalanda';
import { StoreState } from 'nalanda';
import { parse, stringify } from 'superjson';
import type { z } from 'zod';

import { assertSafeZodSchema } from './zod-helpers';

export type NoInfer<T> = [T][T extends any ? 0 : never];

interface SerializationMetadata<T = unknown> {
  schema: z.ZodTypeAny;
  serialize?: (val: [T]) => any;
  deserialize?: (val: any) => [T];
}

const lookupTable = new Map<string, SerializationMetadata<any>>();

function getSerializationMetadata(
  lineageId: LineageId,
  actionId: string,
): undefined | SerializationMetadata {
  return lookupTable.get(lineageId + actionId);
}

export const payloadSerializer: PayloadSerializer = (payload, tx) => {
  const serial = getSerializationMetadata(tx.sourceSliceLineage, tx.actionId);

  if (!serial) {
    throw new Error(
      `Unable to serialize action with id "${tx.actionId}" in slice "${tx.sourceSliceLineage}", did you forget to use serialAction?`,
    );
  }

  if (payload.length !== 1) {
    throw new Error(
      `Unable to serialize action with id "${tx.actionId}" in slice "${tx.sourceSliceLineage}", payload must be an array of length 1`,
    );
  }

  if (serial.serialize) {
    return stringify(serial.serialize([payload[0]]));
  }

  return stringify(payload);
};

export const payloadParser: PayloadParser = (payload, txnJSON, store) => {
  // TODO we can probably cleanup some of this extra checks to improve perf
  const lineageId = StoreState.getLineageId(store.state, txnJSON.sourceSliceId);

  const serial = getSerializationMetadata(lineageId, txnJSON.actionId);

  if (!serial) {
    throw new Error(
      `Unable to deserializeTransaction, slice ${lineageId} with ${txnJSON.actionId} was not found`,
    );
  }

  if (typeof payload !== 'string') {
    throw new Error(`deserializeTransaction: payload is not a string`);
  }

  if (serial.deserialize) {
    return serial.deserialize(parse(payload));
  }

  return parse(payload);
};

export function serialAction<Z extends z.ZodTypeAny, SS, DS extends string>(
  schema: Z,
  actionBuilder: ActionBuilder<[z.infer<Z>], SS, DS>,
): ActionBuilder<[z.infer<Z>], SS, DS> {
  assertSafeZodSchema(schema);

  // this gets called on slice init
  actionBuilder.setContextDetails = (context) => {
    lookupTable.set(context.lineageId + context.actionId, { schema });
  };

  return actionBuilder;
}

// when you have some custom type that you can convert to zod type
export function customSerialAction<
  T extends any,
  SS,
  DS extends string,
  Z extends z.ZodTypeAny,
  R,
>(
  actionBuilder: ActionBuilder<[T], SS, DS>,
  {
    schema,
    serialize,
    deserialize,
  }: {
    schema: Z;
    serialize: (args: NoInfer<T>) => R;
    deserialize: (args: NoInfer<R>) => NoInfer<T>;
  },
): ActionBuilder<[T], SS, DS> {
  assertSafeZodSchema(schema);

  // this gets called on slice init
  actionBuilder.setContextDetails = (context) => {
    lookupTable.set(context.lineageId + context.actionId, {
      schema,
      serialize: (v) => {
        return serialize(v[0]);
      },
      deserialize: (obj) => {
        return [deserialize(obj)];
      },
    });
  };

  return actionBuilder;
}

export function validateSlicesForSerialization(sl: AnySlice[]) {
  for (const slice of sl) {
    for (const [actionName] of Object.entries(slice.spec.actionBuilders)) {
      if (!lookupTable.has(slice.spec.lineageId + actionName)) {
        throw new Error(
          `validateSlices: slice ${slice.spec.name} is using an action ${actionName} that does not have serialization setup`,
        );
      }
    }
  }
}

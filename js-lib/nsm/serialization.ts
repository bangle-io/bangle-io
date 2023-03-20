import type { ActionBuilder, BareStore, Slice } from 'nalanda';
import { getActionBuilderByKey, Transaction } from 'nalanda';
import { parse, stringify } from 'superjson';
import type { z } from 'zod';

import { zodFindUnsafeTypes } from './zod-helpers';

export type NoInfer<T> = [T][T extends any ? 0 : never];

type AnyActionBuilder = ActionBuilder<any, any, any>;
type AnyActionSlice = Slice<
  string,
  any,
  any,
  Record<string, AnyActionBuilder>,
  {}
>;

const METADATA_KEY = Symbol('serialization_metadata');

interface SerializationMetadata<T = unknown> {
  schema: z.ZodTypeAny;
  serialize?: (val: [T]) => any;
  deserialize?: (val: any) => [T];
}

function setSerializationMetadata<T = unknown>(
  action: AnyActionBuilder,
  metadata: SerializationMetadata<T>,
) {
  if (!action.metadata) {
    action.metadata = {};
  }
  action.metadata[METADATA_KEY] = metadata;
}

function getSerializationMetadata(
  action: AnyActionBuilder,
): undefined | SerializationMetadata {
  return action.metadata?.[METADATA_KEY];
}

export function serializeTransaction(
  tx: Transaction<any, any>,
  store: BareStore<any>,
) {
  const action = getActionBuilderByKey(store, tx.sourceSliceKey, tx.actionId);

  if (!action) {
    throw new Error(
      `serializeTransaction: action with id "${tx.actionId}" wasn't serializable in slice "${tx.sourceSliceKey}"`,
    );
  }

  const serial = getSerializationMetadata(action);

  if (!serial) {
    throw new Error(
      `Unable to serialize action with id "${tx.actionId}" in slice "${tx.sourceSliceKey}", did you forget to use serialAction?`,
    );
  }

  return tx.toJSONObj((payload) => {
    if (serial.serialize) {
      return stringify(serial.serialize([payload[0]]));
    }

    return stringify(payload);
  });
}

export function deserializeTransaction(
  txObj: ReturnType<Transaction<any, any>['toJSONObj']>,
  store: BareStore<any>,
): Transaction<string, any[]> {
  const { sourceSliceKey, actionId } = txObj;

  if (!sourceSliceKey || !actionId) {
    throw new Error(
      `deserializeTransaction: transaction object is missing sourceSliceKey or actionId`,
    );
  }
  let action = getActionBuilderByKey(store, sourceSliceKey, actionId);

  if (!action) {
    throw new Error(
      `deserializeTransaction: action with id "${actionId}" wasn't serializable in slice "${sourceSliceKey}"`,
    );
  }

  const serial = getSerializationMetadata(action)!;

  return Transaction.fromJSONObj(txObj, (payload) => {
    if (serial.deserialize) {
      return serial.deserialize(parse(payload));
    }

    return parse(payload);
  });
}

export function serialAction<
  Z extends z.ZodTypeAny,
  SS,
  DS extends AnyActionSlice,
>(
  schema: Z,
  action: ActionBuilder<[z.infer<Z>], SS, DS>,
): ActionBuilder<[z.infer<Z>], SS, DS> {
  let unsafeTypes = zodFindUnsafeTypes(schema);

  if (unsafeTypes.length > 0) {
    throw new Error(
      `serialAction: schema contains unsafe types: ${unsafeTypes.join(', ')}`,
    );
  }

  setSerializationMetadata(action, { schema });

  return action;
}

// when you have some custom type that you can convert to zod type
export function customSerialAction<
  T extends any,
  SS,
  DS extends AnyActionSlice,
  Z extends z.ZodTypeAny,
  R,
>(
  action: ActionBuilder<[T], SS, DS>,
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
  let unsafeTypes = zodFindUnsafeTypes(schema);

  if (unsafeTypes.length > 0) {
    throw new Error(
      `serialAction: schema contains unsafe types: ${unsafeTypes.join(', ')}`,
    );
  }

  setSerializationMetadata<T>(action, {
    schema,
    serialize: (v) => {
      return serialize(v[0]);
    },
    deserialize: (obj) => {
      return [deserialize(obj)];
    },
  });

  return action;
}

function isActionSerializable(action: AnyActionBuilder): boolean {
  return action.metadata?.[METADATA_KEY] !== undefined;
}

export function validateSlicesForSerialization(sl: AnyActionSlice[]) {
  for (const slice of sl) {
    for (const [actionName, action] of Object.entries(slice.spec.actions)) {
      if (!isActionSerializable(action)) {
        throw new Error(
          `validateSlices: slice ${slice.name} is using an action ${actionName} that is not serializable`,
        );
      }
    }
  }
}

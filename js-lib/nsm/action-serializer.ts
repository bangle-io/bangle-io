import type { z } from 'zod';

import type { Slice, SliceKey } from './slice';
import type { AnyFn, RawAction, SelectorFn } from './types';
import { zodFindUnsafeTypes } from './zod';

export type ActionSerialData<P extends any[]> = {
  parse: (data: unknown) => P;
  serialize: (payload: P) => unknown;
};
export const serialActionCache = new WeakMap<AnyFn, ActionSerialData<any>>();

export function serialAction<T extends z.ZodTypeAny, SS, DS extends Slice[]>(
  schema: T,
  cb: RawAction<[z.infer<T>], SS, DS>,
  opts?: {
    parse?: (schema: T, data: unknown) => [z.infer<T>];
    serialize?: (schema: T, payload: [z.infer<T>]) => unknown;
  },
): RawAction<[z.infer<T>], SS, DS> {
  let unsafeTypes = zodFindUnsafeTypes(schema);

  if (unsafeTypes.length > 0) {
    throw new Error(
      `serialAction: schema contains unsafe types: ${unsafeTypes.join(', ')}`,
    );
  }

  serialActionCache.set(cb, {
    parse: (data: unknown) => {
      if (opts?.parse) {
        return opts.parse(schema, data);
      }

      return [data];
    },
    serialize: (payload: [z.infer<T>]): unknown => {
      if (opts?.serialize) {
        return opts.serialize(schema, payload);
      }

      return payload[0];
    },
  });

  return cb;
}

export class ActionSerializer<
  K extends string = string,
  SS extends object = object,
  DS extends Slice[] = any[],
  A extends Record<string, RawAction<any[], SS, DS>> = any,
  SE extends Record<string, SelectorFn<SS, DS, any>> = any,
> {
  getRawAction = (actionId: string): RawAction<any, any, any> | undefined => {
    const action = this.rawActions[actionId];

    if (!action) {
      return undefined;
    }

    return action;
  };

  constructor(public key: SliceKey<K, SS, SE, DS>, public rawActions: A) {}

  getRawSerializedAction(actionId: string):
    | {
        action: RawAction<any, any, any>;
        serialData: ActionSerialData<any>;
      }
    | undefined {
    const action = this.getRawAction(actionId);

    if (!action) {
      throw new Error(`Action ${actionId} not found in slice ${this.key.key}`);
    }

    const serialData = serialActionCache.get(action);

    if (!serialData) {
      throw new Error(
        `Action ${actionId} in slice ${this.key.key} is not serializable`,
      );
    }

    return {
      action,
      serialData,
    };
  }

  isSyncReady(): boolean {
    // all actions must be serial
    return Object.values(this.rawActions).every((action) =>
      serialActionCache.has(action),
    );
  }

  parseActionPayload<AK extends keyof A>(
    actionId: AK extends string ? AK : never,
    payload: unknown,
  ): Parameters<A[AK]> {
    const action = this.getRawSerializedAction(actionId);

    if (!action) {
      throw new Error(
        `Action ${actionId} not found or does not have a serializer`,
      );
    }

    return action.serialData.parse(payload);
  }

  serializeActionPayload<AK extends keyof A>(
    actionId: AK extends string ? AK : never,
    payload: Parameters<A[AK]>,
  ): unknown {
    const action = this.getRawAction(actionId);

    if (!action) {
      throw new Error(`Action ${actionId} not found in slice ${this.key.key}`);
    }

    const serialData = serialActionCache.get(action);

    if (!serialData) {
      throw new Error(
        `Serialize Action ${actionId} in slice ${this.key.key} not found`,
      );
    }

    return serialData.serialize(payload);
  }
}

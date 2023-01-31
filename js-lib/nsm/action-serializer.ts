import type { z } from 'zod';

import type { AnyFn, RawAction, RawJsAction, SelectorFn } from './common';
import type { Slice, SliceKey } from './slice';

export type ActionSerialData<P extends any[]> = {
  parse: (data: unknown) => P;
  serialize: (payload: P) => unknown;
};
export const serialActionCache = new WeakMap<AnyFn, ActionSerialData<any>>();

export function serialAction<T extends z.ZodTypeAny, SS, DS extends Slice[]>(
  schema: T,
  cb: RawJsAction<[z.infer<T>], SS, DS>,
): RawAction<[z.infer<T>], SS, DS> {
  serialActionCache.set(cb, {
    parse: (data: unknown) => [data],
    serialize: (payload: [z.infer<T>]): unknown => payload[0],
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
  getRawAction = (actionId: string): RawJsAction<any, any, any> | undefined => {
    const action = this.rawActions[actionId];

    if (!action) {
      return undefined;
    }

    return action;
  };

  constructor(public key: SliceKey<K, SS, SE, DS>, public rawActions: A) {}

  getRawSerializedAction(actionId: string):
    | {
        action: RawJsAction<any, any, any>;
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
    payload: unknown,
    actionId: AK extends string ? AK : never,
  ): Parameters<A[AK]> {
    const action = this.getRawSerializedAction(actionId);

    if (!action) {
      throw new Error(
        `Action ${actionId} not found or does not have a serializer`,
      );
    }

    return action.serialData.parse(payload);
  }

  serializeActionPayload(payload: unknown, actionId: string): unknown {
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

    return serialData.serialize(payload);
  }
}

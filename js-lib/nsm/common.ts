import type { RawAction } from './slice';
import type { StoreState } from './state';

export type AnyFn = (...args: any[]) => any;

export const expectType = <Type>(_: Type): void => void 0;

export type ReplaceReturnType<T extends (...args: any) => any, R> = T extends (
  ...args: infer P
) => any
  ? (...ag: P) => R
  : never;

export type InferSliceKey<SL extends AnySliceBase> = SL extends SliceBase<
  infer K,
  any
>
  ? K
  : never;

// returns a union of all slice keys
export type InferSlicesKey<SlicesRegistry extends AnySliceBase[]> = {
  [K in keyof SlicesRegistry]: InferSliceKey<SlicesRegistry[K]>;
}[number];

// returns a slice if it is registered in the slice registry
export type ResolveSliceIfRegistered<
  SL extends AnySliceBase,
  SliceRegistry extends AnySliceBase[],
> = SL extends SliceBase<infer K, any>
  ? K extends InferSlicesKey<SliceRegistry>
    ? SL
    : never
  : never;

export interface SliceKeyBase<K extends string, SS> {
  key: K;
  initState: SS;
  dependencies?: Record<string, SliceBase<string, unknown>>;
}

export interface EffectsBase {
  update?: AnyFn;
  once?: AnyFn;
}

export type AnySliceBase = SliceBase<string, unknown>;

export interface SliceBase<K extends string, SS> {
  key: SliceKeyBase<K, SS>;
  fingerPrint: string;
  effects?: EffectsBase[];
  _getRawAction: (actionId: string) => RawAction<any, any, any> | undefined;
}

export interface StoreTransaction<K extends string, P extends unknown[]>
  extends Transaction<K, P> {
  id: string;
}

export interface Transaction<K extends string, P extends unknown[]> {
  sliceKey: K;
  actionId: string;
  payload: P;
}

export function mapObjectValues<T, U>(
  obj: Record<string, T>,
  fn: (v: T, k: string) => U,
): Record<string, U> {
  const newObj: Record<string, U> = Object.create(null);

  for (const [key, value] of Object.entries(obj)) {
    newObj[key] = fn(value, key);
  }

  return newObj;
}

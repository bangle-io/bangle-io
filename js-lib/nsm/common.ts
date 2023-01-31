import type { z } from 'zod';

import type { Slice } from './slice';
import type { StoreState } from './state';
import type { Store } from './store';

export type AnyFn = (...args: any[]) => any;

export const serialActionCache = new WeakMap<AnyFn, ActionSerialData<any>>();

export function mySerialAction<T extends z.ZodTypeAny, SS, DS extends Slice[]>(
  schema: T,
  cb: RawJsAction<[z.infer<T>], SS, DS>,
): RawAction<[z.infer<T>], SS, DS> {
  serialActionCache.set(cb, {
    parse: (data: string) => [{}],
    serialize: (payload: [z.infer<T>]) => '',
  });

  return cb;
}

export const expectType = <Type>(_: Type): void => void 0;

export type ReplaceReturnType<T extends (...args: any) => any, R> = T extends (
  ...args: infer P
) => any
  ? (...ag: P) => R
  : never;

export type SelectorFn<SS, DS extends Slice[], T> = (
  sliceState: SS,
  storeState: StoreState<DS>,
) => T;

export type ActionSerialData<P extends any[]> = {
  parse: (data: string) => P;
  serialize: (payload: P) => string;
};

//  TODO remove this
export type RawJsAction<P extends any[], SS, DS extends Slice[]> = (
  ...payload: P
) => (sliceState: SS, storeState: StoreState<DS>) => SS;

export type RawAction<P extends any[], SS, DS extends Slice[]> = (
  ...payload: P
) => (sliceState: SS, storeState: StoreState<DS>) => SS;

export type Action<K extends string, P extends any[] = unknown[]> = (
  ...payload: P
) => Transaction<K, P>;

export type InferSliceKey<SL extends AnySliceBase> = SL extends SliceBase<
  infer K,
  any
>
  ? K
  : never;

export type InferSliceDep<SL extends AnySliceBase> = SL extends Slice<
  any,
  any,
  infer DS
>
  ? DS[number]
  : never;

// returns a union of all slice keys
export type InferSlicesKey<SlicesRegistry extends AnySliceBase[]> = {
  [K in keyof SlicesRegistry]: InferSliceKey<SlicesRegistry[K]>;
}[number];

export type MiniStoreForSlice<SL extends Slice> = Store<
  Array<SL | InferSliceDep<SL>>
>;

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
  dependencies?: Array<SliceBase<string, unknown>>;
}

export interface EffectsBase<SL extends Slice> {
  update?: (sl: SL, store: MiniStoreForSlice<SL>) => void;
  once?: AnyFn;
}

export type AnySliceBase = SliceBase<string, unknown>;

export interface SliceBase<K extends string, SS> {
  key: SliceKeyBase<K, SS>;
  fingerPrint: string;
  effects?: Array<EffectsBase<any>>;
  _getRawAction: (actionId: string) => RawJsAction<any, any, any> | undefined;
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

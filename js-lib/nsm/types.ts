import type { ActionSerializer } from './action-serializer';
import type { Slice } from './slice';
import type { StoreState } from './state';
import type { ReducedStore } from './store';

export type AnyFn = (...args: any[]) => any;

export type AnySliceBase = SliceBase<string, unknown>;

export type ExtractReturnTypes<
  T extends Record<string, (...args: any[]) => any>,
> = {
  [K in keyof T]: T[K] extends (i: any) => infer R ? R : never;
};

export type ReplaceReturnType<T extends (...args: any) => any, R> = T extends (
  ...args: infer P
) => any
  ? (...ag: P) => R
  : never;

export type SelectorFn<SS, DS extends Slice[], T> = (
  sliceState: SS,
  storeState: StoreState<DS>,
) => T;

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
  dependencies: Array<SliceBase<string, unknown>>;
}

export interface EffectsBase<SL extends Slice = any> {
  updateSync?: (
    sl: SL,
    store: ReducedStore<SL | InferSliceDep<SL>>,
    prevStoreState: ReducedStore<SL | InferSliceDep<SL>>['state'],
  ) => void;
  update?: (
    sl: SL,
    store: ReducedStore<SL | InferSliceDep<SL>>,
    prevStoreState: ReducedStore<SL | InferSliceDep<SL>>['state'],
  ) => void;
}

export interface SliceBase<K extends string, SS> {
  key: SliceKeyBase<K, SS>;
  fingerPrint: string;
  effects?: EffectsBase[];
  // TODO make any to SS
  _actionSerializer: ActionSerializer<K>;
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

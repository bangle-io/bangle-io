import type { ActionSerializer } from './action-serializer';
import type { Slice } from './slice';
import type { StoreState } from './state';
import type { Store } from './store';

export type AnyFn = (...args: any[]) => any;

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

export interface EffectsBase<SL extends Slice = Slice> {
  updateSync?: (
    sl: SL,
    store: Store<Array<SL | InferSliceDep<SL>>>,
    prevStoreState: StoreState<Array<SL | InferSliceDep<SL>>>,
  ) => void;
  update?: (
    sl: SL,
    store: Store<Array<SL | InferSliceDep<SL>>>,
    prevStoreState: StoreState<Array<SL | InferSliceDep<SL>>>,
  ) => void;
  once?: (
    sl: SL,
    store: Store<Array<SL | InferSliceDep<SL>>>,
  ) => void | (() => void);
}

export type AnySliceBase = SliceBase<string, unknown>;

export interface SliceBase<K extends string, SS> {
  key: SliceKeyBase<K, SS>;
  fingerPrint: string;
  effects?: Array<EffectsBase<any>>;
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

export function objectHasOwnProperty<X extends {}, Y extends PropertyKey>(
  obj: X,
  prop: Y,
): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function calcReverseDependencies(
  slices: AnySliceBase[],
): Record<string, Set<string>> {
  let reverseDependencies: Record<string, Set<string>> = {};

  for (const slice of slices) {
    for (const dep of slice.key.dependencies) {
      let result = reverseDependencies[dep.key.key];

      if (!result) {
        result = new Set();
        reverseDependencies[dep.key.key] = result;
      }

      result.add(slice.key.key);
    }
  }

  return reverseDependencies;
}

export function flattenReverseDependencies(
  reverseDep: Record<string, Set<string>>,
) {
  const result: Record<string, Set<string>> = {};

  const recurse = (key: string) => {
    let vals = result[key];

    if (vals) {
      return vals;
    }

    vals = new Set<string>();
    result[key] = vals;

    const deps = reverseDep[key];

    if (deps) {
      for (const dep of deps) {
        vals.add(dep);
        for (const v of recurse(dep)) {
          vals.add(v);
        }
      }
    }

    return vals;
  };

  for (const key of Object.keys(reverseDep)) {
    recurse(key);
  }

  return result;
}

export function calcDependencies(
  slices: AnySliceBase[],
): Record<string, Set<string>> {
  return Object.fromEntries(
    slices.map((slice) => [
      slice.key.key,
      new Set(slice.key.dependencies.map((dep) => dep.key.key)),
    ]),
  );
}

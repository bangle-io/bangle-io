import type { StoreState } from './state';

export type AnyFn = (...args: any[]) => any;

export const expectType = <Type>(_: Type): void => void 0;

export type ReplaceReturnType<T extends (...args: any) => any, R> = T extends (
  ...args: infer P
) => any
  ? (...ag: P) => R
  : never;

export interface StoreStateBase<SB extends AnySliceBase[]> {}

export interface StoreBase<SB extends AnySliceBase[]> {
  state: StoreStateBase<SB>;
}

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

  applyTransaction: (
    tx: Transaction<K, unknown[]>,
    storeState: StoreState,
  ) => SS;
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

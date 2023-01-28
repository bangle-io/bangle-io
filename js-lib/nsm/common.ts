import type { StoreState } from './state';

export type AnyFn = (...args: any[]) => any;

export const expectType = <Type>(_: Type): void => void 0;

export type ReplaceReturnType<T extends (...args: any) => any, R> = T extends (
  ...args: infer P
) => any
  ? (...ag: P) => R
  : never;

export interface SliceKeyBase<SS = unknown> {
  key: string;
  initState: SS;
  dependencies?: Record<string, SliceBase<any>>;
}

export interface EffectsBase {
  update?: AnyFn;
  once?: AnyFn;
}

export interface SliceBase<SS = unknown> {
  key: SliceKeyBase<SS>;
  fingerPrint: string;
  effects?: EffectsBase[];

  applyTransaction: (tx: Transaction, storeState: StoreState) => SS;
}

export interface StoreTransaction extends Transaction {
  id: string;
}

export interface Transaction<P extends unknown[] = unknown[]> {
  sliceKey: string;
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

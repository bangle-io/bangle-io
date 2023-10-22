import type { BaseSlice, Slice } from './slice';
import type { StoreState } from './store-state';

export type AnySlice = Slice<any, any, any>;

export type GetStoreState<TSlice extends AnySlice> = TSlice extends Slice<
  infer TSliceName,
  any,
  any
>
  ? StoreState<TSliceName>
  : never;

/**
 * Hack for nominal typing
 * https://basarat.gitbook.io/typescript/main-1/nominaltyping
 */
declare const __brand: unique symbol;
export type Brand<T, K> = T & { [__brand]: K };

// Magic type that when used at sites where generic types are inferred from, will prevent those sites from being involved in the inference.
// https://github.com/microsoft/TypeScript/issues/14829
export type NoInfer<T> = [T][T extends any ? 0 : never];

export type SliceId = Brand<string, 'SliceId'>;
export type ActionId = Brand<string, 'ActionId'>;

export type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T
  ? 1
  : 2) extends <G>() => G extends U ? 1 : 2
  ? Y
  : N;

export const expectType = <Expected, Actual>(
  _actual: IfEquals<Actual, Expected, Actual>,
) => void 0;

export type InferSliceNameFromSlice<T> = T extends BaseSlice<
  infer TSliceName,
  any,
  any
>
  ? TSliceName
  : never;

export type InferDepNameFromSlice<T> = T extends BaseSlice<any, any, infer TDep>
  ? TDep
  : never;

export type ExtractReturnTypes<
  T extends Record<string, (...args: any[]) => any>,
> = {
  [K in keyof T]: T[K] extends (...args: any[]) => infer R ? R : never;
} & {};

/**
 * Returns `true` if type `A` extends type `B`, `false` if not.
 * If A is a subtype of B return true
 *
 * @param A Type
 * @param B Type
 * @return Boolean
 */
export type DoesExtendBool<A, B> = [A] extends [B] ? true : false;
export type DoesExtend<A, B> = [A] extends [B] ? A : never;

// WARNING !! Should not import any other env oriented library
// should only focus on Javascript and NO BROWSER or NODEJS specific apis

export * from './base-error';
export * from './browser';
export { createEmptyArray } from './create-empty-array';
export { DuoWeakMap } from './duo-weak-map';
export * from './emitter';
export { getLast } from './get-last';
export * from './is-abort-error';
export * from './mini-zod';
export { weakCache } from './weak-cache';
export { weakCacheDuo } from './weak-cache-duo';

export function isPlainObject(value: any) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  );
}

const _deepMerge = (
  target0: Record<string, any>,
  source: Record<string, any>,
  rootPath = '',
) => {
  const target = { ...target0 };

  for (const key of Object.keys(source)) {
    if (isPlainObject(target[key])) {
      target[key] = _deepMerge(
        target[key],
        source[key],
        rootPath ? `${rootPath}.${key}` : key,
      );
    } else if (Array.isArray(target[key]) && Array.isArray(source[key])) {
      target[key] = [...target[key], ...source[key]];
    } else {
      target[key] = source[key];
    }
  }

  return target;
};

/**
 *
 * @param target the target object to merge into
 * @param ...source will traverse this object and merge into target
 * @returns
 */
export function deepMerge(
  target: Record<string, any>,
  ...source: Record<string, any>[]
) {
  let result = { ...target };

  for (const s of source) {
    result = _deepMerge(result, s);
  }

  return result;
}
export function difference<T>(main: T[] | Set<T>, sub: T[] | Set<T>): T[] {
  const a = new Set(main);
  const b = new Set(sub);

  return [...a].filter((x) => !b.has(x));
}

export function intersect<T>(main: T[] | Set<T>, sub: T[] | Set<T>): T[] {
  const a = new Set(main);
  const b = new Set(sub);

  return [...new Set([...a].filter((x) => b.has(x)))];
}

/**
 * Hack for nominal typing
 * https://basarat.gitbook.io/typescript/main-1/nominaltyping
 */
declare const __brand: unique symbol;
export type Brand<T, K> = T & { [__brand]: K };

export type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T
  ? 1
  : 2) extends <G>() => G extends U ? 1 : 2
  ? Y
  : N;

export const expectType = <Expected, Actual>(
  _actual: IfEquals<Actual, Expected, Actual>,
) => void 0;

/**
 * from: https://github.com/microsoft/vscode/blob/6697193a79694d59c8e4f586330ee7a95c42b1b1/src/vs/base/common/types.ts#L97
 */
export function assertIsDefined<T>(
  arg: T | null | undefined,
  hint?: string,
): asserts arg is T {
  if (isUndefinedOrNull(arg)) {
    throw new Error(`Assertion Failed: argument is undefined or null. ${hint}`);
  }
}

export function isUndefinedOrNull(obj: unknown): obj is undefined | null {
  return isUndefined(obj) || obj === null;
}

export function isUndefined(obj: unknown): obj is undefined {
  return typeof obj === 'undefined';
}

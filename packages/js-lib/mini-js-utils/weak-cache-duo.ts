import { DuoWeakMap } from './duo-weak-map';

/**
 * Like weakCache but works on functions that take two arguments
 * @param fn - A function with arity=2 whose parameters are non-primitive,
 * @returns
 */
export function weakCacheDuo<K1 extends object, K2 extends object, R>(
  fn: (arg1: K1, arg2: K2) => R,
): (arg1: K1, arg2: K2) => R {
  const cache = new DuoWeakMap<K1, K2, R>();

  return (arg1: K1, arg2: K2): R => {
    if (cache.has([arg1, arg2])) {
      return cache.get([arg1, arg2]) as R;
    }

    const value = fn(arg1, arg2);
    cache.set([arg1, arg2], value);

    return value;
  };
}

import { DuoWeakMap } from './duo-weak-map';

/**
 * Like weakCache but works on functions that take two arguments
 * @param fn - A function with arity=2 whose parameters are non-primitive,
 * @returns
 */
export function weakCacheDuo<R, P extends (arg1: any, arg2: any) => R>(
  fn: P,
): P {
  const cache = new DuoWeakMap<any, any, R>();

  const res = (arg1: any, arg2: any): R => {
    let value = cache.get([arg1, arg2]);

    if (value !== undefined) {
      return value;
    }

    value = fn(arg1, arg2);
    cache.set([arg1, arg2], value);

    return value;
  };

  return res as P;
}

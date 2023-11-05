/**
 * @param {Function} fn - A unary function whose parameter is non-primitive,
 *                        so that it can be cached using WeakMap
 */
export function weakCache<R, T extends (arg: any) => R>(
  fn: T,
  debugName?: string,
): T {
  const cache = new WeakMap<any, R>();
  const res = (arg: any): R => {
    if (cache.has(arg)) {
      if (debugName) {
        console.debug(debugName, 'cache hit');
      }

      return cache.get(arg)!;
    }
    if (debugName) {
      console.debug(debugName, 'cache miss');
    }

    let value = fn(arg);
    cache.set(arg, value);

    return value;
  };

  return res as T;
}

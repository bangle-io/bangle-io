/**
 * @param {Function} fn - A unary function whose parameter is non-primitive,
 *                        so that it can be cached using WeakMap
 */
export function weakCache<K extends object, R>(
  fn: (arg: K) => R,
  debugName?: string,
): (arg: K) => R {
  const cache = new WeakMap<K, R>();
  return (arg: K): R => {
    if (cache.has(arg)) {
      if (debugName) {
        console.debug(debugName, 'cache hit');
      }
      return cache.get(arg) as R;
    }
    if (debugName) {
      console.debug(debugName, 'cache miss');
    }

    const value = fn(arg);
    cache.set(arg, value);

    return value;
  };
}

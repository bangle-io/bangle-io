// WARNING !! Should not import any other env oriented library
// should only focus on Javascript and NO BROWSER or NODEJS specific apis

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

/**
 *
 * @param target the target object to merge into
 * @param source will traverse this object and merge into target
 * @returns
 */
export function deepMerge(
  target: Record<string, any>,
  source: Record<string, any>,
) {
  const _deepMerge = (
    target: Record<string, any>,
    source: Record<string, any>,
    rootPath = '',
  ) => {
    target = { ...target };
    Object.keys(source).forEach((key) => {
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
    });

    return target;
  };

  return _deepMerge(target, source);
}

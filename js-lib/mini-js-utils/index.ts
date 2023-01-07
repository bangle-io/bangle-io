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

/**
 *
 * @param target the target object to merge into
 * @param ...source will traverse this object and merge into target
 * @returns
 */
export function deepMerge(
  target: Record<string, any>,
  ...source: Array<Record<string, any>>
) {
  let result = { ...target };

  source.forEach((s) => {
    result = _deepMerge(result, s);
  });

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

export function safeJSONParse(
  str: string,
): { success: true; value: any } | { success: false } {
  try {
    return { success: true, value: JSON.parse(str) };
  } catch (error) {
    return { success: false };
  }
}

export function safeJSONStringify(
  value: any,
): { success: true; value: string } | { success: false } {
  try {
    return { success: true, value: JSON.stringify(value) };
  } catch (error) {
    return { success: false };
  }
}

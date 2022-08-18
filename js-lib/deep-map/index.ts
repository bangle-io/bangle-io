import isPlainObject from 'is-plain-obj';

/**
 * Deep map over an object or array. Just like Array.map() but for objects.
 * Will not descend into objects that are not plain objects.
 * @param obj
 * @param mapFn
 * @returns
 */
export function deepMap<T>(obj: T, mapFn: (v: any) => any): any {
  let object = mapFn(obj);

  if (Array.isArray(object)) {
    return object.map((item) => deepMap(item, mapFn));
  }

  if (isPlainObject(object)) {
    return Object.fromEntries(
      Object.entries(object).map(([key, value]) => {
        return [key, deepMap(value, mapFn)];
      }),
    );
  }

  return object;
}

type Primitive = string;

export type WalkableStringRecord = {
  [Key in string | number]: Primitive | WalkableStringRecord;
};

type MapLeafNodes<Obj, LeafType> = {
  [Prop in keyof Obj]: Obj[Prop] extends Primitive
    ? LeafType
    : Obj[Prop] extends Record<string | number, any>
    ? MapLeafNodes<Obj[Prop], LeafType>
    : never;
};
export function walkObject<T extends WalkableStringRecord, MapTo>(
  obj: T,
  fn: (value: Primitive, path: string[]) => MapTo,
  path: string[] = [],
): MapLeafNodes<T, MapTo> {
  const clone = obj.constructor();

  for (let key in obj) {
    const value = obj[key];
    const currentPath = [...path, key];

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      value == null
    ) {
      clone[key] = fn(value as Primitive, currentPath);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      clone[key] = walkObject(value as WalkableStringRecord, fn, currentPath);
    } else {
      console.warn(
        `Skipping invalid key "${currentPath.join(
          '.',
        )}". Should be a string, number, null or object. Received: "${
          Array.isArray(value) ? 'Array' : typeof value
        }"`,
      );
    }
  }

  return clone;
}

export function getFromPath(obj: any, path: string[]) {
  let result = obj;

  for (const key of path) {
    if (!(key in result)) {
      throw new Error(`Path ${path.join(' -> ')} does not exist in object`);
    }
    result = result[key];
  }

  return result;
}

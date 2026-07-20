export type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export function isJsonValue(
  value: unknown,
  ancestors = new Set<object>(),
): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value !== 'object' || ancestors.has(value)) {
    return false;
  }

  ancestors.add(value);
  const result = Array.isArray(value)
    ? isJsonArray(value, ancestors)
    : isJsonObject(value, ancestors);
  ancestors.delete(value);
  return result;
}

function isJsonArray(value: unknown[], ancestors: Set<object>): boolean {
  const keys = Object.keys(value);
  const ownKeys = Reflect.ownKeys(value);
  if (
    keys.length !== value.length ||
    ownKeys.length !== keys.length + 1 ||
    !ownKeys.includes('length')
  ) {
    return false;
  }

  return keys.every((key, index) => {
    if (key !== String(index)) {
      return false;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return (
      descriptor !== undefined &&
      'value' in descriptor &&
      isJsonValue(descriptor.value, ancestors)
    );
  });
}

function isJsonObject(value: object, ancestors: Set<object>): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) {
    return false;
  }

  const keys = Object.keys(value);
  if (Reflect.ownKeys(value).length !== keys.length) {
    return false;
  }

  return keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return (
      descriptor !== undefined &&
      'value' in descriptor &&
      isJsonValue(descriptor.value, ancestors)
    );
  });
}

export type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonValueSnapshotResult =
  | { success: true; serialized: string; value: JsonValue }
  | { success: false; error: Error };

/**
 * Produces the exact detached value represented by JSON serialization.
 */
export function createJsonValueSnapshot(
  value: unknown,
): JsonValueSnapshotResult {
  try {
    if (!isJsonValue(value)) {
      return {
        success: false,
        error: new Error('Value is not JSON-safe'),
      };
    }

    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      return {
        success: false,
        error: new Error('JSON.stringify returned undefined'),
      };
    }

    const snapshot: unknown = JSON.parse(serialized);
    if (!isJsonValue(snapshot)) {
      return {
        success: false,
        error: new Error('JSON snapshot is not JSON-safe'),
      };
    }

    return { success: true, serialized, value: snapshot };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error
          : new Error('Failed to create JSON snapshot'),
    };
  }
}

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

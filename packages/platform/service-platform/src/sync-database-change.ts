import { createJsonValueSnapshot } from '@bangle.io/base-utils';
import type { SyncDatabaseChange } from '@bangle.io/types';

export function parseSyncDatabaseChange(
  input: unknown,
): SyncDatabaseChange | undefined {
  if (
    !input ||
    typeof input !== 'object' ||
    !('type' in input) ||
    !('tableName' in input) ||
    !('key' in input) ||
    !('value' in input) ||
    input.tableName !== 'sync' ||
    typeof input.key !== 'string'
  ) {
    return undefined;
  }

  if (input.type === 'delete') {
    return input.value === undefined
      ? {
          type: 'delete',
          tableName: input.tableName,
          key: input.key,
          value: undefined,
        }
      : undefined;
  }

  if (input.type !== 'create' && input.type !== 'update') {
    return undefined;
  }

  const snapshot = createJsonValueSnapshot(input.value);
  if (!snapshot.success) {
    return undefined;
  }

  return {
    type: input.type,
    tableName: input.tableName,
    key: input.key,
    value: snapshot.value,
  };
}

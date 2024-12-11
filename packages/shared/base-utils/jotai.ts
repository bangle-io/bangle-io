import type { Logger } from '@bangle.io/logger';
import type { BaseAppSyncDatabase } from '@bangle.io/types';
import { atomWithReducer, atomWithStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';
import type { Validator } from '../../js-lib/mini-zod/src';

export function atomWithCompare<Value>(
  initialValue: Value,
  areEqual: (prev: Value, next: Value) => boolean,
) {
  return atomWithReducer(initialValue, (prev: Value, next: Value) => {
    if (areEqual(prev, next)) {
      return prev;
    }

    return next;
  });
}

export function arrayEqual<T>(a: T[], b: T[]) {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

// should be used for simple UI config that needs to be persisted
export function atomStorage<TValue>({
  key,
  initValue,
  syncDb,
  validator,
  logger,
}: {
  key: string;
  initValue: TValue;
  syncDb: BaseAppSyncDatabase;
  validator: Validator<TValue>;
  logger: Logger;
}) {
  const atom = atomWithStorage<TValue>(
    key,
    initValue,
    {
      getItem: (key) => {
        const result = syncDb.getEntry(key, { tableName: 'sync' });
        if (!result.found) {
          return initValue;
        }
        return validator.validate(result.value) ? result.value : initValue;
      },
      setItem: (key, value) => {
        if (!validator.validate(value)) {
          logger.error('Invalid value for key', key, value);
          return;
        }

        syncDb.updateEntry(key, () => ({ value }), { tableName: 'sync' });
      },
      removeItem: (key) => syncDb.deleteEntry(key, { tableName: 'sync' }),
      subscribe: (key, callback) => {
        const abortController = new AbortController();

        syncDb.subscribe(
          { tableName: 'sync' },
          (change) => {
            if (change.key === key) {
              if (validator.validate(change.value)) {
                callback(change.value);
              } else {
                logger.error(
                  'Invalid value received for key',
                  key,
                  change.value,
                );
              }
            }
          },
          abortController.signal,
        );

        return () => {
          abortController.abort();
        };
      },
    } satisfies SyncStorage<TValue>,
    { getOnInit: true },
  );

  return atom;
}

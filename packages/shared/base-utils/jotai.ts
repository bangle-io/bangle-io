import type { Logger } from '@bangle.io/logger';
import type { BaseError, JsonValue, Validator } from '@bangle.io/mini-js-utils';
import { createJsonValueSnapshot } from '@bangle.io/mini-js-utils';
import type { BaseAppSyncDatabase } from '@bangle.io/types';
import type { Atom } from 'jotai';
import { atom } from 'jotai';
import { atomWithReducer, atomWithStorage, RESET, unwrap } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';
import { wrapPromiseInAppErrorHandler } from './throw-app-error';

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
  serviceName,
  key: inputKey,
  initValue,
  syncDb,
  validator,
  logger,
}: {
  serviceName: string;
  key: string;
  initValue: TValue;
  syncDb: BaseAppSyncDatabase;
  validator: Validator<TValue>;
  logger: Logger;
}) {
  const storageKey = `${serviceName}:${inputKey}`;

  const canonicalize = (value: unknown): (TValue & JsonValue) | undefined => {
    const snapshot = createJsonValueSnapshot(value);
    return snapshot.success && validator.validate(snapshot.value)
      ? snapshot.value
      : undefined;
  };

  const initialValue = canonicalize(initValue);
  if (initialValue === undefined) {
    throw new Error(`Invalid initial value for ${storageKey}`);
  }

  const storageAtom = atomWithStorage<TValue>(
    storageKey,
    initialValue,
    {
      getItem: (key) => {
        const result = syncDb.getEntry(key, { tableName: 'sync' });
        if (!result.found) {
          return initialValue;
        }
        return canonicalize(result.value) ?? initialValue;
      },
      setItem: (key, value) => {
        const canonicalValue = canonicalize(value);
        if (canonicalValue === undefined) {
          logger.error('Invalid value for key', key, value);
          return;
        }

        syncDb.updateEntry(key, () => ({ value: canonicalValue }), {
          tableName: 'sync',
        });
      },
      removeItem: (key) => syncDb.deleteEntry(key, { tableName: 'sync' }),
      subscribe: (key, callback) => {
        const abortController = new AbortController();

        syncDb.subscribe(
          { tableName: 'sync' },
          (change) => {
            if (change.key === key) {
              if (change.type === 'delete') {
                callback(initialValue);
                return;
              }

              const canonicalValue = canonicalize(change.value);
              if (canonicalValue === undefined) {
                logger.error(
                  'Invalid value received for key',
                  key,
                  change.value,
                );
                return;
              }

              callback(canonicalValue);
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

  type Update =
    | TValue
    | typeof RESET
    | ((previous: TValue) => TValue | typeof RESET);

  const isUpdater = (
    update: Update,
  ): update is (previous: TValue) => TValue | typeof RESET =>
    typeof update === 'function';

  return atom(
    (get) => get(storageAtom),
    (get, set, update: Update) => {
      const previousValue = canonicalize(get(storageAtom));
      if (previousValue === undefined) {
        logger.error('Invalid current value for key', storageKey);
        return;
      }
      const nextValue = isUpdater(update) ? update(previousValue) : update;

      if (nextValue === RESET) {
        set(storageAtom, RESET);
        return;
      }

      const canonicalValue = canonicalize(nextValue);
      if (canonicalValue === undefined) {
        logger.error('Invalid value for key', storageKey, nextValue);
        return;
      }

      set(storageAtom, canonicalValue);
    },
  );
}

/**
 * Creates a Jotai atom that unwraps a promise, handling errors gracefully.
 *
 * This is a convenience method that combines `atom`, `unwrap`, and error handling
 * using `atomHandleAppError`.
 *
 * @param asyncGetter - An async function that takes a Jotai `get` function and an options object with an `AbortSignal`.
 *                      It should return a Promise that resolves to the atom's value.
 * @param initialValue - A function that returns the initial value of the atom. It can optionally take the previous value.
 * @param emitAppErrorFn - A callback that emits an app error.
 * @returns A Jotai atom.
 */
export function createAsyncAtom<Value>(
  asyncGetter: (
    get: <V>(atom: Atom<V>) => V,
    options: { signal: AbortSignal },
  ) => Promise<Value>,
  initialValue: (prev?: Value) => NoInfer<Value>,
  emitAppErrorFn: (error: BaseError) => void,
): Atom<Value> {
  return unwrap(
    atom(async (get, { signal }) => {
      // TODO  should we pass prev here??
      const fallback = initialValue() as unknown as Value;
      return wrapPromiseInAppErrorHandler(
        asyncGetter(get, { signal }),
        fallback,
        emitAppErrorFn,
      );
    }),
    initialValue,
  );
}

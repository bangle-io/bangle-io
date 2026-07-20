import {
  BaseService,
  type BaseServiceContext,
  createJsonValueSnapshot,
  throwAppError,
} from '@bangle.io/base-utils';
import { TypedBroadcastBus } from '@bangle.io/browser-utils';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { SERVICE_NAME } from '@bangle.io/constants';
import type {
  BaseAppSyncDatabase,
  JsonValue,
  SyncDatabaseChange,
  SyncDatabaseQueryOptions,
} from '@bangle.io/types';
import { parseSyncDatabaseChange } from './sync-database-change';

export class BrowserLocalStorageSyncDatabaseService
  extends BaseService
  implements BaseAppSyncDatabase
{
  private storage: Storage = window.localStorage;
  private syncBus?: TypedBroadcastBus<SyncDatabaseChange>;

  constructor(context: BaseServiceContext, dependencies: null) {
    super(
      SERVICE_NAME.browserLocalStorageSyncDatabaseService,
      context,
      dependencies,
    );
  }

  async hookMount(): Promise<void> {
    this.syncBus = new TypedBroadcastBus<SyncDatabaseChange>({
      name: `${this.name}`,
      senderId: BROWSING_CONTEXT_ID,
      logger: this.logger?.child('bus'),
      signal: this.abortSignal,
    });
  }

  getEntry(
    key: string,
    options: SyncDatabaseQueryOptions,
  ): { found: boolean; value: JsonValue | undefined } {
    const storageKey = this.getStorageKey(key, options.tableName);
    const item = this.storage.getItem(storageKey);

    if (item === null) {
      return { found: false, value: undefined };
    }

    const parsed = this.parseJSON(item);
    if (!parsed.parsed) {
      return { found: false, value: undefined };
    }

    return { found: true, value: parsed.value };
  }

  updateEntry(
    key: string,
    updateCallback: (options: {
      value: JsonValue | undefined;
      found: boolean;
    }) => null | {
      value: JsonValue;
    },
    options: SyncDatabaseQueryOptions,
  ): { value: JsonValue | undefined; found: boolean } {
    const storageKey = this.getStorageKey(key, options.tableName);
    const item = this.storage.getItem(storageKey);

    const { found, value: existingValue } = (() => {
      if (item === null) {
        return { found: false, value: undefined };
      }

      const parsed = this.parseJSON(item);
      if (!parsed.parsed) {
        throwAppError(
          'error::database:unknown-error',
          'Cannot update malformed local storage database entry',
          {
            error: parsed.error,
            databaseName: this.name,
          },
        );
      }

      return { found: true, value: parsed.value };
    })();

    const updateResult = updateCallback({
      value: existingValue,
      found,
    });

    if (!updateResult) {
      return { value: undefined, found: false };
    }

    const snapshot = this.snapshot(updateResult.value);

    this.storage.setItem(storageKey, snapshot.serialized);

    const change: SyncDatabaseChange = {
      type: found ? 'update' : 'create',
      tableName: options.tableName,
      key,
      value: snapshot.value,
    };

    this.syncBus?.send(change);

    const returnSnapshot = this.snapshot(snapshot.value);
    return { value: returnSnapshot.value, found: true };
  }

  deleteEntry(key: string, options: SyncDatabaseQueryOptions): void {
    const storageKey = this.getStorageKey(key, options.tableName);
    const item = this.storage.getItem(storageKey);

    if (item === null) {
      return;
    }

    this.storage.removeItem(storageKey);

    const change: SyncDatabaseChange = {
      type: 'delete',
      tableName: options.tableName,
      key,
      value: undefined,
    };

    this.syncBus?.send(change);
  }

  getAllEntries(options: SyncDatabaseQueryOptions): JsonValue[] {
    const entries: JsonValue[] = [];
    const tablePrefix = this.getTablePrefix(options.tableName);

    for (let i = 0; i < this.storage.length; i++) {
      const storageKey = this.storage.key(i);

      if (storageKey?.startsWith(tablePrefix)) {
        const item = this.storage.getItem(storageKey);

        if (item !== null) {
          const parsed = this.parseJSON(item);
          if (parsed.parsed) {
            entries.push(parsed.value);
          }
        }
      }
    }

    return entries;
  }

  subscribe(
    options: SyncDatabaseQueryOptions,
    callback: (change: SyncDatabaseChange) => void,
    signal: AbortSignal,
  ): void {
    if (this.aborted) {
      return;
    }

    this.syncBus?.subscribe((msg) => {
      const change = parseSyncDatabaseChange(msg.data);
      if (!change) {
        this.logger.error('Invalid sync database change received', msg.data);
        return;
      }
      if (change.tableName === options.tableName) {
        callback(change);
      }
    }, signal);
  }

  private getStorageKey(key: string, tableName: string): string {
    return `${this.getTablePrefix(tableName)}:${key}`;
  }

  private getTablePrefix(tableName: string): string {
    return `${this.name}.${tableName}`;
  }

  private parseJSON(
    item: string,
  ): { parsed: true; value: JsonValue } | { parsed: false; error: Error } {
    try {
      const snapshot = createJsonValueSnapshot(JSON.parse(item));
      if (!snapshot.success) {
        throw snapshot.error;
      }
      return { parsed: true, value: snapshot.value };
    } catch (error) {
      this.logger.error('Failed to parse JSON from local storage', error);
      return {
        parsed: false,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to parse JSON from local storage'),
      };
    }
  }

  private snapshot(value: unknown) {
    const snapshot = createJsonValueSnapshot(value);
    if (!snapshot.success) {
      throwAppError(
        'error::database:unknown-error',
        'Cannot store unsupported local storage database value',
        { error: snapshot.error, databaseName: this.name },
      );
    }
    return snapshot;
  }
}

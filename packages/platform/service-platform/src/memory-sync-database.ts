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

export class MemorySyncDatabaseService
  extends BaseService
  implements BaseAppSyncDatabase
{
  private storage = new Map<string, JsonValue>();
  private changeBus?: TypedBroadcastBus<SyncDatabaseChange>;

  constructor(context: BaseServiceContext, dependencies: null) {
    super(SERVICE_NAME.memorySyncDatabaseService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    this.changeBus = new TypedBroadcastBus({
      name: this.name,
      senderId: BROWSING_CONTEXT_ID,
      logger: this.logger.child('bus'),
      useMemoryChannel: true,
      signal: this.abortSignal,
    });
  }

  getEntry(
    key: string,
    options: SyncDatabaseQueryOptions,
  ): { found: boolean; value: JsonValue | undefined } {
    const storageKey = this.getStorageKey(key, options.tableName);
    const value = this.storage.get(storageKey);
    return {
      found: value !== undefined,
      value: value === undefined ? undefined : this.snapshot(value),
    };
  }

  updateEntry(
    key: string,
    updateCallback: (options: {
      value: JsonValue | undefined;
      found: boolean;
    }) => {
      value: JsonValue;
    } | null,
    options: SyncDatabaseQueryOptions,
  ): { value: JsonValue | undefined; found: boolean } {
    const storageKey = this.getStorageKey(key, options.tableName);
    const storedValue = this.storage.get(storageKey);
    const existingValue =
      storedValue === undefined ? undefined : this.snapshot(storedValue);
    const found = this.storage.has(storageKey);

    const updateResult = updateCallback({ value: existingValue, found });

    if (updateResult) {
      const storedSnapshot = this.snapshot(updateResult.value);
      this.storage.set(storageKey, storedSnapshot);
      this.publishChange({
        type: found ? 'update' : 'create',
        tableName: options.tableName,
        key,
        value: storedSnapshot,
      });
      return { value: this.snapshot(storedSnapshot), found: true };
    }

    return { value: undefined, found: false };
  }

  deleteEntry(key: string, options: SyncDatabaseQueryOptions): void {
    const storageKey = this.getStorageKey(key, options.tableName);
    const found = this.storage.delete(storageKey);

    if (found) {
      this.publishChange({
        type: 'delete',
        tableName: options.tableName,
        key,
        value: undefined,
      });
    }
  }

  getAllEntries(options: SyncDatabaseQueryOptions): JsonValue[] {
    const tablePrefix = this.getTablePrefix(options.tableName);
    const entries: JsonValue[] = [];

    for (const [key, value] of this.storage.entries()) {
      if (key.startsWith(tablePrefix)) {
        entries.push(this.snapshot(value));
      }
    }

    return entries;
  }

  subscribe(
    options: SyncDatabaseQueryOptions,
    callback: (change: SyncDatabaseChange) => void,
    signal: AbortSignal,
  ): void {
    if (!this.mounted || !this.changeBus) {
      return;
    }
    this.changeBus.subscribe((msg) => {
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

  private publishChange(change: SyncDatabaseChange) {
    const snapshot = parseSyncDatabaseChange(change);
    if (!snapshot) {
      throw new Error('Cannot publish invalid sync database change');
    }
    this.changeBus?.send(snapshot);
  }

  private snapshot(value: unknown): JsonValue {
    const snapshot = createJsonValueSnapshot(value);
    if (!snapshot.success) {
      throwAppError(
        'error::database:unknown-error',
        'Cannot store unsupported memory sync database value',
        { error: snapshot.error, databaseName: this.name },
      );
    }
    return snapshot.value;
  }
}

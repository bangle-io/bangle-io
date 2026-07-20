import {
  BaseService,
  type BaseServiceContext,
  isJsonValue,
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
    return { found: value !== undefined, value };
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
    const existingValue = this.storage.get(storageKey);
    const found = this.storage.has(storageKey);

    const updateResult = updateCallback({ value: existingValue, found });

    if (updateResult) {
      if (!isJsonValue(updateResult.value)) {
        const error = new Error('Value is not JSON-safe');
        throwAppError(
          'error::database:unknown-error',
          'Cannot store unsupported memory sync database value',
          { error, databaseName: this.name },
        );
      }

      this.storage.set(storageKey, updateResult.value);
      this.publishChange({
        type: found ? 'update' : 'create',
        tableName: options.tableName,
        key,
        value: updateResult.value,
      });
      return { value: updateResult.value, found: true };
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
        entries.push(value);
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
      if (msg.data.tableName === options.tableName) {
        callback(msg.data);
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
    this.changeBus?.send(change);
  }
}

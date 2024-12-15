import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';
import { TypedBroadcastBus } from '@bangle.io/broadcast-channel';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { SERVICE_NAME } from '@bangle.io/constants';

import type {
  BaseAppSyncDatabase,
  SyncDatabaseChange,
  SyncDatabaseQueryOptions,
} from '@bangle.io/types';

export class MemorySyncDatabaseService
  extends BaseService2
  implements BaseAppSyncDatabase
{
  private storage = new Map<string, unknown>();
  private changeBus?: TypedBroadcastBus<SyncDatabaseChange>;

  constructor(context: BaseServiceContext, dependencies: null, _config: null) {
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
  ): { found: boolean; value: unknown } {
    const storageKey = this.getStorageKey(key, options.tableName);
    const value = this.storage.get(storageKey);
    return { found: value !== undefined, value };
  }

  updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => {
      value: unknown;
    } | null,
    options: SyncDatabaseQueryOptions,
  ): { value: unknown; found: boolean } {
    const storageKey = this.getStorageKey(key, options.tableName);
    const existingValue = this.storage.get(storageKey);
    const found = this.storage.has(storageKey);

    const updateResult = updateCallback({ value: existingValue, found });

    if (updateResult) {
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

  getAllEntries(options: SyncDatabaseQueryOptions): unknown[] {
    const tablePrefix = this.getTablePrefix(options.tableName);
    const entries: unknown[] = [];

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

import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';
import { TypedBroadcastBus } from '@bangle.io/broadcast-channel';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { SERVICE_NAME } from '@bangle.io/constants';
import type {
  BaseAppSyncDatabase,
  SyncDatabaseChange,
  SyncDatabaseQueryOptions,
} from '@bangle.io/types';

export class BrowserLocalStorageSyncDatabaseService
  extends BaseService2
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
  ): { found: boolean; value: unknown } {
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
    updateCallback: (options: { value: unknown; found: boolean }) => null | {
      value: unknown;
    },
    options: SyncDatabaseQueryOptions,
  ): { value: unknown; found: boolean } {
    const storageKey = this.getStorageKey(key, options.tableName);
    const item = this.storage.getItem(storageKey);

    const { found, value: existingValue } = (() => {
      if (item === null) {
        return { found: false, value: undefined };
      }
      const parsed = this.parseJSON(item);
      return parsed.parsed
        ? { found: true, value: parsed.value }
        : { found: false, value: undefined };
    })();

    const updateResult = updateCallback({
      value: existingValue,
      found,
    });

    if (!updateResult) {
      return { value: undefined, found: false };
    }

    const serializedValue = this.stringifyJSON(updateResult.value);
    if (serializedValue === null) {
      return { value: undefined, found: false };
    }

    this.storage.setItem(storageKey, serializedValue);

    const change: SyncDatabaseChange = {
      type: found ? 'update' : 'create',
      tableName: options.tableName,
      key,
      value: updateResult.value,
    };

    this.syncBus?.send(change);

    return { value: updateResult.value, found: true };
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

  getAllEntries(options: SyncDatabaseQueryOptions): unknown[] {
    const entries: unknown[] = [];
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

  private parseJSON(
    item: string,
  ): { parsed: true; value: unknown } | { parsed: false } {
    try {
      return { parsed: true, value: JSON.parse(item) };
    } catch (error) {
      this.logger.error('Failed to parse JSON from local storage', error);
      return { parsed: false };
    }
  }

  private stringifyJSON(value: unknown): string | null {
    try {
      return JSON.stringify(value);
    } catch (error) {
      this.logger.error('Failed to stringify JSON for local storage', error);
      return null;
    }
  }
}

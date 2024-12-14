import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';
import { TypedBroadcastBus } from '@bangle.io/broadcast-channel';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
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
  //   since this is and we cannot initialize the bus in the constructor as it will start emitting events before the service is ready
  // we make it optional we will lose some events but it should only be a brief period at app start
  private bus?: TypedBroadcastBus<SyncDatabaseChange>;

  constructor(context: BaseServiceContext, dependencies: null) {
    super('browser-local-storage-sync-database', context, dependencies);
  }

  async hookMount(): Promise<void> {
    this.bus = new TypedBroadcastBus<SyncDatabaseChange>({
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
    if (item !== null && typeof item === 'string') {
      const parsed = this.parseJSON(item);
      if (parsed.parsed) {
        return { found: true, value: parsed.value };
      }
    }
    return { found: false, value: undefined };
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

    const [found, existingValue] = (() => {
      if (item !== null) {
        const parsed = this.parseJSON(item);
        return parsed.parsed ? [true, parsed.value] : [false, undefined];
      }
      return [false, undefined];
    })();

    const result = updateCallback({
      value: existingValue,
      found: found,
    });

    if (!result) {
      return { value: undefined, found: false };
    }
    const serializedValue = this.stringifyJSON(result.value);
    if (serializedValue === null) {
      return { value: undefined, found: false };
    }

    this.storage.setItem(storageKey, serializedValue);

    const change: SyncDatabaseChange = {
      type: found ? 'update' : 'create',
      tableName: options.tableName,
      key,
      value: result.value,
    };

    this.bus?.send(change);

    return { value: result.value, found: true };
  }

  deleteEntry(key: string, options: SyncDatabaseQueryOptions): void {
    const storageKey = this.getStorageKey(key, options.tableName);
    const found = this.storage.getItem(storageKey) !== null;
    if (found) {
      this.storage.removeItem(storageKey);

      const change: SyncDatabaseChange = {
        type: 'delete',
        tableName: options.tableName,
        key,
        value: undefined,
      };
      this.bus?.send(change);
    }
  }

  getAllEntries(options: SyncDatabaseQueryOptions): unknown[] {
    const entries: unknown[] = [];
    const prefix = this.getTablePrefix(options.tableName);
    for (let i = 0; i < this.storage.length; i++) {
      const storageKey = this.storage.key(i);
      if (storageKey?.startsWith(prefix)) {
        const item = this.storage.getItem(storageKey);
        if (item !== null) {
          const value = this.parseJSON(item);
          if (value !== undefined) {
            entries.push(value);
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

    this.bus?.subscribe((msg) => {
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
      const parsed = JSON.parse(item);
      return { parsed: true, value: parsed };
    } catch (err) {
      this.logger.error('Failed to parse JSON', err);
      return {
        parsed: false,
      };
    }
  }

  private stringifyJSON(value: unknown): string | null {
    try {
      return JSON.stringify(value);
    } catch (err) {
      this.logger.error(err);
      return null;
    }
  }
}

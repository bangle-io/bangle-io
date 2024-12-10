import { BaseService } from '@bangle.io/base-utils';
import type {
  BaseAppSyncDatabase,
  BaseServiceCommonOptions,
  SyncDatabaseQueryOptions,
  SyncDatabaseChange,
} from '@bangle.io/types';
import { TypedBroadcastBus } from '@bangle.io/broadcast-channel';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';

export class MemorySyncDatabaseService
  extends BaseService
  implements BaseAppSyncDatabase
{
  private storage = new Map<string, unknown>();
  //   since this is and we cannot initialize the bus in the constructor as it will start emitting events before the service is ready
  // we make it optional we will lose some events but it should only be a brief period at app start
  private bus?: TypedBroadcastBus<SyncDatabaseChange>;

  constructor(baseOptions: BaseServiceCommonOptions, dependencies: undefined) {
    super({
      ...baseOptions,
      name: 'memory-sync-database',
      kind: 'platform',
      dependencies,
    });
  }

  protected async hookOnInitialize(): Promise<void> {
    // since this is sync we will need the bus to be ready
    this.bus = new TypedBroadcastBus({
      name: `${this.name}`,
      senderId: BROWSING_CONTEXT_ID,
      logger: this.logger.child('bus'),
      useMemoryChannel: true,
      signal: this.abortSignal,
    });
  }

  protected async hookOnDispose(): Promise<void> {}

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
    const existing = this.storage.get(storageKey);
    const found = this.storage.has(storageKey);

    const result = updateCallback({ value: existing, found });

    if (result) {
      this.storage.set(storageKey, result.value);
      const change: SyncDatabaseChange = {
        type: found ? 'update' : 'create',
        tableName: options.tableName,
        key,
        value: result.value,
      };
      this.bus?.send(change);
      return { value: result.value, found: true };
    }

    return { value: undefined, found: false };
  }

  deleteEntry(key: string, options: SyncDatabaseQueryOptions): void {
    const storageKey = this.getStorageKey(key, options.tableName);
    const found = this.storage.delete(storageKey);

    if (found) {
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
    const prefix = this.getTablePrefix(options.tableName);
    const entries: unknown[] = [];

    for (const [key, value] of this.storage.entries()) {
      if (key.startsWith(prefix)) {
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
    if (this.isDisposed) {
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
}

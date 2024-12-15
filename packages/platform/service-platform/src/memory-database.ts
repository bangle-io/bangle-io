import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';
import { TypedBroadcastBus } from '@bangle.io/broadcast-channel';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { SERVICE_NAME } from '@bangle.io/constants';
import type {
  BaseAppDatabase,
  DatabaseChange,
  DatabaseQueryOptions,
} from '@bangle.io/types';

export class MemoryDatabaseService
  extends BaseService2
  implements BaseAppDatabase
{
  private workspaces = new Map<string, unknown>();
  private miscData = new Map<string, unknown>();
  private bus!: TypedBroadcastBus<DatabaseChange>;

  constructor(context: BaseServiceContext, dependencies: null) {
    super(SERVICE_NAME.memoryDatabaseService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    this.bus = new TypedBroadcastBus({
      name: `${this.name}`,
      senderId: BROWSING_CONTEXT_ID,
      logger: this.logger.child('bus'),
      useMemoryChannel: true,
      signal: this.abortSignal,
    });

    this.addCleanup(() => {
      this.workspaces.clear();
      this.miscData.clear();
    });
  }

  async getEntry(
    key: string,
    options: DatabaseQueryOptions,
  ): Promise<{ found: boolean; value: unknown }> {
    const dataMap =
      options.tableName === 'workspace-info' ? this.workspaces : this.miscData;
    const value = dataMap.get(key);
    const found = value !== undefined;
    return { found, value };
  }

  async updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => {
      value: unknown;
    } | null,
    options: DatabaseQueryOptions,
  ): Promise<{ value: unknown; found: boolean }> {
    const dataMap =
      options.tableName === 'workspace-info' ? this.workspaces : this.miscData;
    const existing = dataMap.get(key);
    const found = dataMap.has(key);

    const result = updateCallback({ value: existing, found });

    if (result) {
      dataMap.set(key, result.value);
      const change: DatabaseChange = {
        type: found ? 'update' : 'create',
        tableName: options.tableName,
        key,
        value: result.value,
      };
      this.bus.send(change);
      return { value: result.value, found: true };
    }

    return { value: undefined, found: false };
  }

  async deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void> {
    const dataMap =
      options.tableName === 'workspace-info' ? this.workspaces : this.miscData;
    const found = dataMap.delete(key);

    if (found) {
      const change: DatabaseChange = {
        type: 'delete',
        tableName: options.tableName,
        key,
        value: undefined,
      };
      this.bus.send(change);
    }
  }

  subscribe(
    options: DatabaseQueryOptions,
    callback: (change: DatabaseChange) => void,
    signal: AbortSignal,
  ): void {
    if (this.aborted) {
      return;
    }
    this.bus.subscribe((msg) => {
      if (msg.data.tableName === options.tableName) {
        callback(msg.data);
      }
    }, signal);
  }

  async getAllEntries(options: DatabaseQueryOptions): Promise<unknown[]> {
    const dataMap =
      options.tableName === 'workspace-info' ? this.workspaces : this.miscData;
    return Array.from(dataMap.values());
  }
}

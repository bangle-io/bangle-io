import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';
import { TypedBroadcastBus } from '@bangle.io/broadcast-channel';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { SERVICE_NAME } from '@bangle.io/constants';
import type {
  BaseAppDatabase,
  DatabaseChange,
  DatabaseQueryOptions,
} from '@bangle.io/types';

type DataMap = Map<string, unknown>;

export class MemoryDatabaseService
  extends BaseService2
  implements BaseAppDatabase
{
  private workspaceData: DataMap = new Map();
  private miscData: DataMap = new Map();
  private bus!: TypedBroadcastBus<DatabaseChange>;

  constructor(context: BaseServiceContext, dependencies: null) {
    super(SERVICE_NAME.memoryDatabaseService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    this.bus = new TypedBroadcastBus({
      name: this.name,
      senderId: BROWSING_CONTEXT_ID,
      logger: this.logger.child('bus'),
      useMemoryChannel: true,
      signal: this.abortSignal,
    });

    this.addCleanup(() => {
      this.workspaceData.clear();
      this.miscData.clear();
    });
  }

  private getDataMap(tableName: DatabaseQueryOptions['tableName']): DataMap {
    return tableName === 'workspace-info' ? this.workspaceData : this.miscData;
  }

  async getEntry(
    key: string,
    options: DatabaseQueryOptions,
  ): Promise<{ found: boolean; value: unknown }> {
    const dataMap = this.getDataMap(options.tableName);
    const value = dataMap.get(key);
    return { found: value !== undefined, value };
  }

  async updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => {
      value: unknown;
    } | null,
    options: DatabaseQueryOptions,
  ): Promise<{ value: unknown; found: boolean }> {
    const dataMap = this.getDataMap(options.tableName);
    const existingValue = dataMap.get(key);
    const found = dataMap.has(key);

    const updateResult = updateCallback({ value: existingValue, found });

    if (updateResult) {
      dataMap.set(key, updateResult.value);
      const change: DatabaseChange = {
        type: found ? 'update' : 'create',
        tableName: options.tableName,
        key,
        value: updateResult.value,
      };
      this.bus.send(change);
      return { value: updateResult.value, found: true };
    }

    return { value: undefined, found: false };
  }

  async deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void> {
    const dataMap = this.getDataMap(options.tableName);
    const deleted = dataMap.delete(key);

    if (deleted) {
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
    const dataMap = this.getDataMap(options.tableName);
    return Array.from(dataMap.values());
  }
}

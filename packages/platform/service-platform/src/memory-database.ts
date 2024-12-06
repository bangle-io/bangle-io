import { BaseService } from '@bangle.io/base-utils';
import type {
  BaseAppDatabase,
  BaseServiceCommonOptions,
  DatabaseQueryOptions,
} from '@bangle.io/types';

export class MemoryDatabaseService
  extends BaseService
  implements BaseAppDatabase
{
  private workspaces = new Map<string, unknown>();
  private miscData = new Map<string, unknown>();

  constructor(baseOptions: BaseServiceCommonOptions, dependencies: undefined) {
    super({
      ...baseOptions,
      name: 'memory-database',
      kind: 'platform',
      dependencies,
    });
  }

  protected async hookOnInitialize(): Promise<void> {}

  protected async hookOnDispose(): Promise<void> {
    this.workspaces.clear();
    this.miscData.clear();
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
      return { value: result.value, found: true };
    }

    return { value: undefined, found: false };
  }

  async deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void> {
    const dataMap =
      options.tableName === 'workspace-info' ? this.workspaces : this.miscData;
    dataMap.delete(key);
  }

  async getAllEntries(options: DatabaseQueryOptions): Promise<unknown[]> {
    const dataMap =
      options.tableName === 'workspace-info' ? this.workspaces : this.miscData;
    return Array.from(dataMap.values());
  }
}

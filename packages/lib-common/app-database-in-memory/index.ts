import { BaseAppDatabase, DatabaseQueryOptions } from '@bangle.io/shared-types';

const WORKSPACE_INFO_TABLE =
  'workspace-info' satisfies DatabaseQueryOptions['tableName'];

export class AppDatabaseInMemory implements BaseAppDatabase {
  name = 'AppDatabaseInMemory';
  constructor(
    public readonly workspaces = new Map<string, unknown>(),
    public readonly miscData = new Map<string, unknown>(),
  ) {}

  async getEntry(
    key: string,
    options: DatabaseQueryOptions,
  ): Promise<{ found: boolean; value: unknown }> {
    const isWorkspaceInfo = options.tableName === WORKSPACE_INFO_TABLE;

    const data = isWorkspaceInfo
      ? this.workspaces.get(key)
      : this.miscData.get(key);
    return {
      found: data !== undefined,
      value: data,
    };
  }

  async updateEntry(
    key: string,
    updateCallback: (options: {
      value: unknown;
      found: boolean;
    }) => { value: unknown } | null,
    options: DatabaseQueryOptions,
  ) {
    const isWorkspaceInfo = options.tableName === WORKSPACE_INFO_TABLE;
    const dataMap = isWorkspaceInfo ? this.workspaces : this.miscData;
    const existing = dataMap.get(key);
    const updated = updateCallback({
      found: existing !== undefined,
      value: existing,
    });

    if (updated) {
      dataMap.set(key, updated.value);

      return {
        found: true,
        value: updated.value,
      };
    }

    return {
      found: false,
      value: undefined,
    };
  }

  async deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void> {
    const isWorkspaceInfo = options.tableName === WORKSPACE_INFO_TABLE;

    const dataMap = isWorkspaceInfo ? this.workspaces : this.miscData;
    dataMap.delete(key);
  }

  async getAllEntries(options: DatabaseQueryOptions): Promise<unknown[]> {
    const isWorkspaceInfo = options.tableName === WORKSPACE_INFO_TABLE;

    return Array.from(
      isWorkspaceInfo ? this.workspaces.values() : this.miscData.values(),
    );
  }
}

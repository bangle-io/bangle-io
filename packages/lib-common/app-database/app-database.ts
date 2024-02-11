import { APP_ERROR_NAME, throwAppError } from '@bangle.io/app-errors';
import { isPlainObject } from '@bangle.io/mini-js-utils';
import type {
  BaseAppDatabase,
  DatabaseQueryOptions,
  WorkspaceDatabaseQueryOptions,
  WorkspaceInfo,
} from '@bangle.io/shared-types';

const WORKSPACE_INFO_TABLE =
  'workspace-info' satisfies DatabaseQueryOptions['tableName'];
const MISC_TABLE = 'misc' satisfies DatabaseQueryOptions['tableName'];

type ChangeEvent =
  | {
      type: 'workspace-create';
      payload: WorkspaceInfo;
    }
  | {
      type: 'workspace-update';
      payload: { name: string };
    }
  | {
      type: 'workspace-delete';
      payload: {
        name: string;
      };
    };

export type AppDatabaseConfig = {
  database: BaseAppDatabase;
  onChange: (change: ChangeEvent) => void;
};

export class AppDatabase {
  constructor(public config: AppDatabaseConfig) {}

  async getWorkspaceInfo(
    wsName: string,
    options?: WorkspaceDatabaseQueryOptions,
  ) {
    const result = await this.config.database.getEntry(wsName, {
      tableName: WORKSPACE_INFO_TABLE,
    });

    if (!result.found) {
      return undefined;
    }

    const wsInfo = result.value as WorkspaceInfo;

    if (!options?.allowDeleted && wsInfo?.deleted) {
      return undefined;
    }

    if (options?.type) {
      return wsInfo && wsInfo.type === options.type ? wsInfo : undefined;
    }

    return wsInfo;
  }

  async createWorkspaceInfo(
    info: Omit<WorkspaceInfo, 'lastModified' | 'deleted'>,
  ): Promise<WorkspaceInfo | undefined> {
    const wsName = info.name;

    const result = await this.config.database.updateEntry(
      wsName,
      (existing) => {
        if (existing.found && !(existing.value as WorkspaceInfo)?.deleted) {
          throwAppError(
            APP_ERROR_NAME.workspaceExists,
            `Cannot create workspace as it already exists`,
            {
              wsName,
            },
          );
        }

        const value: WorkspaceInfo = {
          ...info,
          deleted: false,
          lastModified: Date.now(),
        };

        return {
          value,
        };
      },
      { tableName: WORKSPACE_INFO_TABLE },
    );

    const updated = result.found ? (result.value as WorkspaceInfo) : undefined;
    if (updated) {
      this.config.onChange({
        type: 'workspace-create',
        payload: updated,
      });

      return updated;
    }

    return undefined;
  }

  async deleteWorkspaceInfo(wsName: string) {
    await this.config.database.updateEntry(
      wsName,
      (existing) => {
        if (!existing.found) {
          throwAppError(
            APP_ERROR_NAME.workspaceNotFound,
            `Cannot delete workspace as it does not exist`,
            {
              wsName,
            },
          );
        }

        const value: WorkspaceInfo = {
          ...(existing.value as WorkspaceInfo),
          lastModified: Date.now(),
          deleted: true,
        };

        return {
          value,
        };
      },
      { tableName: WORKSPACE_INFO_TABLE },
    );

    this.config.onChange({
      type: 'workspace-delete',
      payload: {
        name: wsName,
      },
    });
  }

  async updateWorkspaceInfo(
    name: string,
    update: (wsInfo: WorkspaceInfo) => WorkspaceInfo,
  ): Promise<WorkspaceInfo | undefined> {
    const result = await this.config.database.updateEntry(
      name,
      (existing) => {
        if (!existing.found) {
          throwAppError(
            APP_ERROR_NAME.workspaceNotFound,
            `Cannot update workspace as it does not exist`,
            {
              wsName: name,
            },
          );
        }

        const existingValue = existing.value as WorkspaceInfo;
        const value = {
          ...existingValue,
          ...update(existingValue),
          lastModified: Date.now(),
        };

        return {
          value,
        };
      },
      {
        tableName: WORKSPACE_INFO_TABLE,
      },
    );

    if (result.found) {
      this.config.onChange({
        type: 'workspace-update',
        payload: {
          name,
        },
      });

      return result.value as WorkspaceInfo;
    }

    return undefined;
  }

  async getAllWorkspaces(options?: {
    type?: WorkspaceInfo['type'];
    allowDeleted?: boolean;
  }) {
    const result = (await this.config.database.getAllEntries({
      tableName: WORKSPACE_INFO_TABLE,
    })) as WorkspaceInfo[];

    return result.filter((wsInfo) => {
      if (!options?.allowDeleted && wsInfo?.deleted) {
        return false;
      }

      if (options?.type) {
        return wsInfo.type === options.type;
      }

      return true;
    });
  }

  async getWorkspaceMetadata(name: string) {
    const result = (await this.getWorkspaceInfo(name))?.metadata;

    if (!isPlainObject(result)) {
      return {};
    }
    return result;
  }

  /**
   * The callback is called with the existing metadata and the
   *  return value is used to replace all of the metadata.
   */
  async updateWorkspaceMetadata(
    name: string,
    metadata: (
      existingMetadata: WorkspaceInfo['metadata'],
    ) => WorkspaceInfo['metadata'],
  ) {
    await this.updateWorkspaceInfo(name, (wsInfo) => {
      const finalMetadata = metadata(wsInfo.metadata ?? {});

      if (!isPlainObject(finalMetadata)) {
        throwAppError(
          APP_ERROR_NAME.workspaceCorrupted,
          `Invalid metadata for workspace ${name}`,
          {
            wsName: name,
          },
        );
      }

      return {
        ...wsInfo,
        metadata: finalMetadata,
      };
    });

    return true;
  }

  async getMiscData(key: string): Promise<{ data: string } | undefined> {
    const data = await this.config.database.getEntry(key, {
      tableName: MISC_TABLE,
    });

    if (!data.found) {
      return undefined;
    }

    if (typeof data.value !== 'string') {
      throwAppError(APP_ERROR_NAME.appDatabaseMiscData, `Invalid misc data`, {
        key,
      });
    }

    return {
      data: data.value,
    };
  }

  async setMiscData(key: string, data: string): Promise<void> {
    if (typeof data !== 'string') {
      throwAppError(
        APP_ERROR_NAME.appDatabaseMiscData,
        `Invalid data for workspace ${key}`,
        {
          key,
        },
      );
    }

    await this.config.database.updateEntry(
      key,
      () => {
        return {
          value: data,
        };
      },
      { tableName: MISC_TABLE },
    );
  }

  async deleteMiscData(key: string): Promise<void> {
    await this.config.database.deleteEntry(key, {
      tableName: MISC_TABLE,
    });
  }
}

import { BaseError } from '@bangle.io/base-error';
import { isPlainObject } from '@bangle.io/mini-js-utils';
import type {
  BaseAppDatabase,
  DatabaseQueryOptions,
  WorkspaceDatabaseQueryOptions,
  WorkspaceInfo,
} from '@bangle.io/shared-types';

import { AppDatabaseErrorCode } from './error-codes';
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

  async createWorkspaceInfo(info: WorkspaceInfo): Promise<void> {
    const wsName = info.name;

    await this.config.database.updateEntry(
      wsName,
      (existing) => {
        if (existing.found) {
          throw new BaseError({
            message: `Workspace with name ${wsName} already exists`,
            code: AppDatabaseErrorCode.WORKSPACE_EXISTS,
            thrower: 'AppDatabase',
          });
        }

        const value: WorkspaceInfo = {
          ...info,
          lastModified: Date.now(),
        };

        return {
          value,
        };
      },
      { tableName: WORKSPACE_INFO_TABLE },
    );

    this.config.onChange({
      type: 'workspace-create',
      payload: info,
    });
  }

  async deleteWorkspaceInfo(wsName: string) {
    await this.config.database.updateEntry(
      wsName,
      (existing) => {
        if (!existing.found) {
          throw new BaseError({
            message: `Workspace with name ${wsName} does not exist`,
            code: AppDatabaseErrorCode.WORKSPACE_NOT_FOUND,
            thrower: 'AppDatabase',
          });
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
  ) {
    await this.config.database.updateEntry(
      name,
      (existing) => {
        if (!existing.found) {
          throw new BaseError({
            message: `Workspace with name ${name} does not exist`,
            code: AppDatabaseErrorCode.WORKSPACE_NOT_FOUND,
            thrower: 'AppDatabase',
          });
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

    this.config.onChange({
      type: 'workspace-update',
      payload: {
        name,
      },
    });
  }

  async getAllWorkspaces(options?: {
    type?: WorkspaceInfo['type'];
    allowDeleted?: boolean;
  }) {
    const result = (await this.config.database.getAllEntries({
      tableName: WORKSPACE_INFO_TABLE,
    })) as WorkspaceInfo[];

    return result.filter((wsInfo) => {
      if (options) {
        if (!options.allowDeleted && wsInfo?.deleted) {
          return false;
        }

        if (options.type) {
          return wsInfo.type === options.type;
        }
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
        throw new BaseError({
          message: `Invalid metadata for workspace ${name}`,
          code: AppDatabaseErrorCode.UNKNOWN_ERROR,
          thrower: 'AppDatabase',
        });
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
      throw new BaseError({
        message: `Invalid misc data for workspace ${key}`,
        code: AppDatabaseErrorCode.UNKNOWN_ERROR,
        thrower: 'AppDatabase',
      });
    }

    return {
      data: data.value,
    };
  }

  async setMiscData(key: string, data: string): Promise<void> {
    if (typeof data !== 'string') {
      throw new BaseError({
        message: `Invalid data for workspace ${key}`,
        code: AppDatabaseErrorCode.UNKNOWN_ERROR,
        thrower: 'AppDatabase',
      });
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

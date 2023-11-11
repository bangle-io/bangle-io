import { BaseError } from '@bangle.io/base-error';
import { WorkspaceInfo } from '@bangle.io/shared-types';

import { BaseAppDatabase, WorkspaceDatabaseQueryOptions } from './base';

export type AppDatabaseErrorConfig = {
  database: BaseAppDatabase;
};

export class AppDatabase {
  constructor(public config: AppDatabaseErrorConfig) {}

  async getWorkspaceInfo(
    name: string,
    options?: WorkspaceDatabaseQueryOptions,
  ) {
    return this.config.database.getWorkspaceInfo(name, options);
  }

  async createWorkspaceInfo(info: WorkspaceInfo) {
    return this.config.database.createWorkspaceInfo(info);
  }

  async deleteWorkspaceInfo(name: string) {
    return this.config.database.updateWorkspaceInfo(name, (wsInfo) => {
      return {
        ...wsInfo,
        deleted: true,
      };
    });
  }

  async updateWorkspaceInfo(
    name: string,
    update: (wsInfo: WorkspaceInfo) => WorkspaceInfo,
  ) {
    return this.config.database.updateWorkspaceInfo(name, update);
  }

  async getWorkspaceMetadata(
    name: string,
    options?: WorkspaceDatabaseQueryOptions,
  ) {
    return this.config.database.getWorkspaceInfo(name, options);
  }

  async getAllWorkspaces(options?: WorkspaceDatabaseQueryOptions) {
    return this.config.database.getAllWorkspaces(options);
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
    const currentWsInfo = await this.getWorkspaceInfo(name);

    if (!currentWsInfo) {
      return false;
    }

    await this.config.database.updateWorkspaceInfo(name, (existing) => ({
      ...currentWsInfo,
      ...existing,
      metadata: {
        ...metadata((existing || currentWsInfo).metadata),
      },
    }));

    return true;
  }
}

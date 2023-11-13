import { WorkspaceInfo } from '@bangle.io/shared-types';

import { BaseAppDatabase, WorkspaceDatabaseQueryOptions } from './base';

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
    name: string,
    options?: WorkspaceDatabaseQueryOptions,
  ) {
    return this.config.database.getWorkspaceInfo(name, options);
  }

  async createWorkspaceInfo(info: WorkspaceInfo): Promise<void> {
    await this.config.database.createWorkspaceInfo(info);
    this.config.onChange({
      type: 'workspace-create',
      payload: info,
    });
  }

  async deleteWorkspaceInfo(name: string) {
    await this.config.database.updateWorkspaceInfo(name, (wsInfo) => {
      return {
        ...wsInfo,
        deleted: true,
      };
    });

    this.config.onChange({
      type: 'workspace-delete',
      payload: {
        name,
      },
    });
  }

  async updateWorkspaceInfo(
    name: string,
    update: (wsInfo: WorkspaceInfo) => WorkspaceInfo,
  ) {
    await this.config.database.updateWorkspaceInfo(name, update);

    this.config.onChange({
      type: 'workspace-update',
      payload: {
        name,
      },
    });
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

    this.config.onChange({
      type: 'workspace-update',
      payload: {
        name,
      },
    });
    return true;
  }

  async getMiscData(key: string): Promise<{ data: string } | undefined> {
    return this.config.database.getMiscData(key);
  }

  async setMiscData(key: string, data: string): Promise<void> {
    await this.config.database.setMiscData(key, data);
  }

  async deleteMiscData(key: string): Promise<void> {
    await this.config.database.deleteMiscData(key);
  }
}

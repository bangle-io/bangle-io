import {
  AppDatabaseErrorCode,
  BaseAppDatabase,
  WorkspaceDatabaseQueryOptions,
} from '@bangle.io/app-database';
import { BaseError } from '@bangle.io/base-error';
import { WorkspaceInfo } from '@bangle.io/shared-types';

export class AppDatabaseInMemory implements BaseAppDatabase {
  name = 'AppDatabaseInMemory';

  constructor(
    public readonly workspaces = new Map<string, WorkspaceInfo>(),
    public readonly miscData = new Map<string, string>(),
  ) {}

  private throwWorkspaceError(
    message: string,
    code: AppDatabaseErrorCode,
  ): never {
    throw new BaseError({
      message,
      code,
      thrower: this.name,
    });
  }

  private throwMiscError(message: string, code: AppDatabaseErrorCode): never {
    throw new BaseError({
      message,
      code,
      thrower: this.name,
    });
  }

  async createWorkspaceInfo(workspaceInfo: WorkspaceInfo): Promise<void> {
    if (this.workspaces.has(workspaceInfo.name)) {
      this.throwWorkspaceError(
        `Workspace already exists`,
        AppDatabaseErrorCode.WORKSPACE_EXISTS,
      );
    }
    this.workspaces.set(workspaceInfo.name, workspaceInfo);
  }

  async getWorkspaceInfo(
    wsName: string,
    options: WorkspaceDatabaseQueryOptions = {},
  ): Promise<WorkspaceInfo | undefined> {
    const workspaceInfo = this.workspaces.get(wsName);
    if (!workspaceInfo) {
      this.throwWorkspaceError(
        `Workspace not found`,
        AppDatabaseErrorCode.WORKSPACE_NOT_FOUND,
      );
    }
    if (workspaceInfo.deleted && !options.allowDeleted) {
      return undefined;
    }
    return workspaceInfo;
  }

  async updateWorkspaceInfo(
    wsName: string,
    updateInfoCallback: (
      workspaceInfo: WorkspaceInfo,
    ) => Partial<WorkspaceInfo>,
  ): Promise<void> {
    const currentInfo = this.workspaces.get(wsName);
    if (!currentInfo) {
      this.throwWorkspaceError(
        `Workspace not found`,
        AppDatabaseErrorCode.WORKSPACE_NOT_FOUND,
      );
    }
    const updatedInfo = updateInfoCallback(currentInfo);
    this.workspaces.set(wsName, { ...currentInfo, ...updatedInfo });
  }
  async getAllWorkspaces(
    options: WorkspaceDatabaseQueryOptions = {},
  ): Promise<WorkspaceInfo[]> {
    try {
      return Array.from(this.workspaces.values()).filter((workspace) => {
        if (options.type && workspace.type !== options.type) {
          return false;
        }
        if (!options.allowDeleted && workspace.deleted) {
          return false;
        }
        return true;
      });
    } catch (error) {
      this.throwWorkspaceError(
        `Error retrieving workspaces`,
        AppDatabaseErrorCode.WORKSPACE_ERROR,
      );
    }
  }

  async getMiscData(key: string): Promise<{ data: string } | undefined> {
    try {
      const data = this.miscData.get(key);
      if (data === undefined) {
        return undefined;
      }
      return { data };
    } catch (error) {
      this.throwMiscError(
        `Error retrieving misc data`,
        AppDatabaseErrorCode.MISC_DATA_ERROR,
      );
    }
  }

  async setMiscData(key: string, serializedData: string): Promise<void> {
    try {
      this.miscData.set(key, serializedData);
    } catch (error) {
      this.throwMiscError(
        `Error setting misc data`,
        AppDatabaseErrorCode.MISC_DATA_ERROR,
      );
    }
  }

  async deleteMiscData(key: string): Promise<void> {
    try {
      if (!this.miscData.has(key)) {
        throw new Error('Data not found');
      }
      this.miscData.delete(key);
    } catch (error) {
      this.throwMiscError(
        `Error deleting misc data`,
        AppDatabaseErrorCode.MISC_DATA_ERROR,
      );
    }
  }
}

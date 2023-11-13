import type { WorkspaceInfo } from '@bangle.io/shared-types';

export type WorkspaceDatabaseQueryOptions = {
  type?: WorkspaceInfo['type'];
  allowDeleted?: boolean;
};

/**
 * This is the interface for the folks to implement their own database.
 */
export interface BaseAppDatabase {
  name: string;

  createWorkspaceInfo: (info: WorkspaceInfo) => Promise<void>;

  getWorkspaceInfo: (
    wsName: string,
    options?: WorkspaceDatabaseQueryOptions,
  ) => Promise<WorkspaceInfo | undefined>;

  updateWorkspaceInfo: (
    wsName: string,
    info: (workspaceInfo: WorkspaceInfo) => Partial<WorkspaceInfo>,
  ) => Promise<void>;

  getAllWorkspaces: (
    options?: WorkspaceDatabaseQueryOptions,
  ) => Promise<WorkspaceInfo[]>;

  /**
   * Gets misc data from the database
   * @param key
   * @returns
   */
  getMiscData: (key: string) => Promise<{ data: string } | undefined>;

  /**
   * Data must be JSON.serializable
   * @param key
   * @param data
   * @returns
   */
  setMiscData: (key: string, data: string) => Promise<void>;

  deleteMiscData: (key: string) => Promise<void>;
}

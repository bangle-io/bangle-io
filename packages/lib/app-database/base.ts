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

  getEntry(
    key: string,
    options?: {
      isWorkspaceInfo?: boolean;
    },
  ): Promise<{ found: boolean; value: unknown }>;

  updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => {
      value: unknown;
    } | null,
    options?: {
      isWorkspaceInfo?: boolean;
    },
  ): Promise<void>;

  deleteEntry(
    key: string,
    options?: {
      isWorkspaceInfo?: boolean;
    },
  ): Promise<void>;

  getAllEntries(options?: { isWorkspaceInfo?: boolean }): Promise<unknown[]>;
}

import { WorkspaceInfo } from './workspace';

export type WorkspaceDatabaseQueryOptions = {
  type?: WorkspaceInfo['type'];
  allowDeleted?: boolean;
};

export type DatabaseQueryOptions = {
  tableName: 'workspace-info' | 'misc';
};
/**
 * This is the interface for the folks to implement their own database.
 */
export interface BaseAppDatabase {
  name: string;

  getEntry(
    key: string,
    options: DatabaseQueryOptions,
  ): Promise<{ found: boolean; value: unknown }>;

  updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => {
      value: unknown;
    } | null,
    options: DatabaseQueryOptions,
  ): Promise<{ value: unknown; found: boolean }>;

  deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void>;

  getAllEntries(options: DatabaseQueryOptions): Promise<unknown[]>;
}

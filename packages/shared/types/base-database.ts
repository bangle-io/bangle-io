export type DatabaseQueryOptions = {
  // this is not the best way to do this, but it's fine for now
  tableName: // table for workspace related information like name, last modified, etc (dont contain actual Files)
    | 'workspace-info'
    // a dump table for all the other information
    | 'misc';
};

export type DatabaseChange = {
  type: 'create' | 'update' | 'delete';
  tableName: DatabaseQueryOptions['tableName'];
  key: string;
  value: unknown;
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

  /**
   * Subscribe to changes in the database
   */
  subscribe(
    options: DatabaseQueryOptions,
    callback: (change: DatabaseChange) => void,
    signal: AbortSignal,
  ): void;
}

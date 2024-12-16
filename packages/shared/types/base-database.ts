import type { DATABASE_TABLE_NAME } from '@bangle.io/constants';

export type DatabaseQueryOptions = {
  tableName: (typeof DATABASE_TABLE_NAME)[keyof typeof DATABASE_TABLE_NAME];
};
export type SyncDatabaseQueryOptions = {
  tableName: 'sync';
};

export type DatabaseChange = {
  type: 'create' | 'update' | 'delete';
  tableName: DatabaseQueryOptions['tableName'];
  key: string;
  value: unknown;
};
export type SyncDatabaseChange = {
  type: 'create' | 'update' | 'delete';
  tableName: SyncDatabaseQueryOptions['tableName'];
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

/**
 * This is the synchronous interface for implementing a sync database.
 * Useful for UI components that need to read/write to the database synchronously.
 */
export interface BaseAppSyncDatabase {
  name: string;

  getEntry(
    key: string,
    options: SyncDatabaseQueryOptions,
  ): { found: boolean; value: unknown };

  updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => null | {
      value: unknown;
    },
    options: SyncDatabaseQueryOptions,
  ): { value: unknown; found: boolean };

  deleteEntry(key: string, options: SyncDatabaseQueryOptions): void;

  getAllEntries(options: SyncDatabaseQueryOptions): unknown[];

  /**
   * Subscribe to changes in the database.
   */
  subscribe(
    options: SyncDatabaseQueryOptions,
    callback: (change: SyncDatabaseChange) => void,
    signal: AbortSignal,
  ): void;
}

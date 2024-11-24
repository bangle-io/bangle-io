import {
  BaseService,
  type BaseServiceCommonOptions,
  isAppError,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  type BangleDbSchema,
  type DbRecord,
  getTable,
  idb,
  makeDbRecord,
} from '@bangle.io/db-key-val';
import type { BaseAppDatabase, DatabaseQueryOptions } from '@bangle.io/types';

export const DB_NAME = 'bangle-io-db';
export const DB_VERSION = 2;
export const MISC_TABLE = 'MiscTable';
export const WORKSPACE_INFO_TABLE = 'WorkspaceInfo';

export const tables = [WORKSPACE_INFO_TABLE, MISC_TABLE] as const;

// for legacy reasons, we have two tables
export interface AppDatabase extends BangleDbSchema {
  [WORKSPACE_INFO_TABLE]: {
    key: string;
    value: DbRecord<unknown>;
  };
  [MISC_TABLE]: {
    key: string;
    value: DbRecord<unknown>;
  };
}

export class IdbDatabaseService extends BaseService implements BaseAppDatabase {
  db!: idb.IDBPDatabase<AppDatabase>;

  constructor(baseOptions: BaseServiceCommonOptions) {
    super({
      ...baseOptions,
      name: 'idb-database',
      kind: 'platform',
      dependencies: {},
    });
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing IndexedDB');
    const logger = this.logger;
    this.db = await idb.openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        logger.info('Upgrading IndexedDB', { oldVersion });
        if (oldVersion < 1) {
          // Version 1 upgrade: Create initial tables
          for (const table of tables) {
            if (!db.objectStoreNames.contains(table)) {
              db.createObjectStore(table, {
                keyPath: 'key',
              });
            }
          }
        }
        if (oldVersion < 2) {
          // Version 2 upgrade: Additional setup for version 2
          // ... (add any version 2 specific upgrades here)
        }
        // if (oldVersion < 3) {
        //   // Version 3 upgrade: Delete DUMMY_TABLE if it exists
        //   const DUMMY_TABLE = 'DummyTable';
        //   //   @ts-expect-error
        //   if (db.objectStoreNames.contains(DUMMY_TABLE)) {
        //     //   @ts-expect-error
        //     db.deleteObjectStore(DUMMY_TABLE);
        //   }
        // }
      },
    });
    this.logger.info('IndexedDB initialized');
  }

  protected async onDispose(): Promise<void> {
    this.logger.info('Disposing IndexedDB');
    this.db.close();
    this.logger.info('IndexedDB disposed');
  }

  private throwUnknownError(error: any): never {
    if (isAppError(error)) {
      this.logger.error('AppError encountered:', error);
      throw error;
    }

    if (error instanceof Error) {
      this.logger.error('Unknown error:', error);
      throwAppError(
        'error::database:unknown-error',
        'Error writing to IndexedDB',
        {
          error,
          databaseName: this.name,
        },
      );
    }
    this.logger.error('Unknown non-Error object:', error);
    throw error;
  }

  private getWorkspaceInfoTable() {
    return getTable(DB_NAME, WORKSPACE_INFO_TABLE, async () => this.db);
  }

  private getMiscTable() {
    return getTable(DB_NAME, MISC_TABLE, async () => this.db);
  }

  async getEntry(
    key: string,
    options: DatabaseQueryOptions,
  ): Promise<{
    found: boolean;
    value: unknown;
  }> {
    await this.initializedPromise;
    const isWorkspaceInfo = options.tableName === 'workspace-info';

    const table = isWorkspaceInfo ? WORKSPACE_INFO_TABLE : MISC_TABLE;
    try {
      const tx = this.db.transaction(table, 'readonly');
      const objStore = tx.objectStore(table);
      const existing = await objStore.get(key);
      await tx.done;

      return {
        found: !!existing,
        value: existing?.value,
      };
    } catch (error) {
      this.throwUnknownError(error);
    }
  }

  async updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => {
      value: unknown;
    } | null,
    options: DatabaseQueryOptions,
  ) {
    await this.initializedPromise;
    const isWorkspaceInfo = options.tableName === 'workspace-info';
    const table = isWorkspaceInfo ? WORKSPACE_INFO_TABLE : MISC_TABLE;
    try {
      const tx = this.db.transaction(table, 'readwrite');
      const objStore = tx.objectStore(table);

      const wsName = key;
      const existing = await objStore.get(wsName);

      const updated = updateCallback({
        found: !!existing,
        value: existing?.value,
      });

      if (!updated) {
        return {
          found: false,
          value: undefined,
        };
      }

      await Promise.all([
        objStore.put(makeDbRecord(wsName, updated.value)),
        tx.done,
      ]);

      return {
        found: true,
        value: updated.value,
      };
    } catch (error) {
      this.throwUnknownError(error);
    }
  }

  async deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void> {
    await this.initializedPromise;
    const isWorkspaceInfo = options.tableName === 'workspace-info';
    const table = isWorkspaceInfo ? WORKSPACE_INFO_TABLE : MISC_TABLE;

    try {
      const tx = this.db.transaction(table, 'readwrite');

      const objStore = tx.objectStore(table);

      await Promise.all([objStore.delete(key), tx.done]);
    } catch (error) {
      this.throwUnknownError(error);
    }

    return;
  }

  async getAllEntries({ tableName }: DatabaseQueryOptions): Promise<unknown[]> {
    await this.initializedPromise;
    if (tableName === 'workspace-info') {
      try {
        return await this.getWorkspaceInfoTable().getAll();
      } catch (error) {
        this.throwUnknownError(error);
      }
    }

    try {
      return await this.getMiscTable().getAll();
    } catch (error) {
      this.throwUnknownError(error);
    }
  }
}

import {
  BaseService,
  type BaseServiceContext,
  isAppError,
  throwAppError,
} from '@bangle.io/base-utils';
import { TypedBroadcastBus } from '@bangle.io/broadcast-channel';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { DATABASE_TABLE_NAME, SERVICE_NAME } from '@bangle.io/constants';
import {
  type BangleDbSchema,
  type DbRecord,
  getTable,
  idb,
  makeDbRecord,
} from '@bangle.io/db-key-val';
import type {
  BaseAppDatabase,
  DatabaseChange,
  DatabaseQueryOptions,
} from '@bangle.io/types';

export const DB_NAME = 'bangle-io-db';
export const DB_VERSION = 2;

export const ALL_TABLES = [
  DATABASE_TABLE_NAME.workspaceInfo,
  DATABASE_TABLE_NAME.misc,
] as const;

export interface AppDatabase extends BangleDbSchema {
  [DATABASE_TABLE_NAME.workspaceInfo]: {
    key: string;
    value: DbRecord<unknown>;
  };
  [DATABASE_TABLE_NAME.misc]: {
    key: string;
    value: DbRecord<unknown>;
  };
}

export class IdbDatabaseService extends BaseService implements BaseAppDatabase {
  db!: idb.IDBPDatabase<AppDatabase>;
  private changeBus!: TypedBroadcastBus<DatabaseChange>;

  constructor(context: BaseServiceContext, dependencies: null, _config: null) {
    super(SERVICE_NAME.idbDatabaseService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    const logger = this.logger;

    this.db = await idb.openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        logger.info('IndexedDB upgrade started', { oldVersion });

        if (oldVersion < 1) {
          for (const table of ALL_TABLES) {
            if (!db.objectStoreNames.contains(table)) {
              db.createObjectStore(table, { keyPath: 'key' });
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
        logger.info('IndexedDB upgrade completed', { oldVersion });
      },
    });

    this.logger.info('IndexedDB initialized');

    this.changeBus = new TypedBroadcastBus({
      name: `${this.name}`,
      senderId: BROWSING_CONTEXT_ID,
      logger: this.logger.child('bus'),
      signal: this.abortSignal,
    });

    this.addCleanup(() => {
      this.db?.close();
    });
  }

  private throwError(error: any): never {
    if (isAppError(error)) {
      this.logger.error('App error:', error);
      throw error;
    }

    if (error instanceof Error) {
      this.logger.error('Unknown error:', error);
      throwAppError(
        'error::database:unknown-error',
        'Failed to perform database operation',
        {
          error,
          databaseName: this.name,
        },
      );
    }
    this.logger.error('Unknown non-Error object:', error);
    throw error;
  }

  private getTableName(options: DatabaseQueryOptions) {
    switch (options.tableName) {
      case DATABASE_TABLE_NAME.workspaceInfo:
        return DATABASE_TABLE_NAME.workspaceInfo;
      case DATABASE_TABLE_NAME.misc:
        return DATABASE_TABLE_NAME.misc;
      default: {
        const _exhaustiveCheck: never = options.tableName;
        throw new Error(`Unknown table name: ${_exhaustiveCheck}`);
      }
    }
  }

  private getTableStore(options: DatabaseQueryOptions) {
    const table = this.getTableName(options);
    return getTable(DB_NAME, table, async () => this.db);
  }

  subscribe(
    options: DatabaseQueryOptions,
    callback: (change: DatabaseChange) => void,
    signal: AbortSignal,
  ): void {
    if (this.aborted) {
      return;
    }
    this.changeBus.subscribe((msg) => {
      if (msg.data.tableName === options.tableName) {
        callback(msg.data);
      }
    }, signal);
  }

  async getEntry(
    key: string,
    options: DatabaseQueryOptions,
  ): Promise<{
    found: boolean;
    value: unknown;
  }> {
    await this.mountPromise;

    const tableName = this.getTableName(options);
    try {
      const tx = this.db.transaction(tableName, 'readonly');
      const objStore = tx.objectStore(tableName);
      const existing = await objStore.get(key);
      await tx.done;

      return {
        found: !!existing,
        value: existing?.value,
      };
    } catch (error) {
      this.throwError(error);
    }
  }

  async updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => {
      value: unknown;
    } | null,
    options: DatabaseQueryOptions,
  ) {
    await this.mountPromise;
    const table = this.getTableName(options);

    const wsName = key;
    try {
      const tx = this.db.transaction(table, 'readwrite');
      const objStore = tx.objectStore(table);
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

      const result = {
        found: true,
        value: updated.value,
      };

      const change: DatabaseChange = {
        type: existing ? 'update' : 'create',
        tableName: options.tableName,
        key,
        value: result.value,
      };
      this.changeBus.send(change);

      return result;
    } catch (error) {
      this.throwError(error);
    }
  }

  async deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void> {
    await this.mountPromise;
    const table = this.getTableName(options);

    try {
      const tx = this.db.transaction(table, 'readwrite');
      const objStore = tx.objectStore(table);

      await Promise.all([objStore.delete(key), tx.done]);

      const change: DatabaseChange = {
        type: 'delete',
        tableName: options.tableName,
        key,
        value: undefined,
      };
      this.changeBus.send(change);
    } catch (error) {
      this.throwError(error);
    }
  }

  async getAllEntries(options: DatabaseQueryOptions): Promise<unknown[]> {
    await this.mountPromise;
    try {
      return await this.getTableStore(options).getAll();
    } catch (error) {
      this.throwError(error);
    }
  }
}

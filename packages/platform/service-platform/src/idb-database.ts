import {
  BaseService2,
  type BaseServiceContext,
  isAppError,
  throwAppError,
} from '@bangle.io/base-utils';
import { TypedBroadcastBus } from '@bangle.io/broadcast-channel';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { SERVICE_NAME } from '@bangle.io/constants';
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

export class IdbDatabaseService
  extends BaseService2
  implements BaseAppDatabase
{
  db!: idb.IDBPDatabase<AppDatabase>;
  private bus!: TypedBroadcastBus<DatabaseChange>;

  constructor(context: BaseServiceContext, dependencies: null, _config: null) {
    super(SERVICE_NAME.idbDatabaseService, context, dependencies);
  }

  async hookMount(): Promise<void> {
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

    this.bus = new TypedBroadcastBus({
      name: `${this.name}`,
      senderId: BROWSING_CONTEXT_ID,
      logger: this.logger.child('bus'),
      signal: this.abortSignal,
    });

    this.addCleanup(() => {
      this.db?.close();
    });
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

  subscribe(
    options: DatabaseQueryOptions,
    callback: (change: DatabaseChange) => void,
    signal: AbortSignal,
  ): void {
    if (this.aborted) {
      return;
    }
    this.bus.subscribe((msg) => {
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
    await this.mountPromise;
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

      const result = {
        found: true,
        value: updated.value,
      };

      if (result.found) {
        const change: DatabaseChange = {
          type: existing ? 'update' : 'create',
          tableName: options.tableName,
          key,
          value: result.value,
        };
        this.bus.send(change);
      }

      return result;
    } catch (error) {
      this.throwUnknownError(error);
    }
  }

  async deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void> {
    await this.mountPromise;
    const isWorkspaceInfo = options.tableName === 'workspace-info';
    const table = isWorkspaceInfo ? WORKSPACE_INFO_TABLE : MISC_TABLE;

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
      this.bus.send(change);
    } catch (error) {
      this.throwUnknownError(error);
    }

    return;
  }

  async getAllEntries({ tableName }: DatabaseQueryOptions): Promise<unknown[]> {
    await this.mountPromise;
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

import {
  BaseService,
  type BaseServiceContext,
  isAppError,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  type BangleDbSchema,
  type DbRecord,
  getTable,
  idb,
  makeDbRecord,
  TypedBroadcastBus,
} from '@bangle.io/browser-utils';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { DATABASE_TABLE_NAME, SERVICE_NAME } from '@bangle.io/constants';
import type {
  BaseAppDatabase,
  DatabaseChange,
  DatabaseQueryOptions,
} from '@bangle.io/types';

export const DB_NAME = 'bangle-io-db';
// v3/v4 add the note snapshot tables (metadata and content bodies).
export const DB_VERSION = 4;
const DEFAULT_OPEN_TIMEOUT_MS = 5_000;

export const ALL_TABLES = [
  DATABASE_TABLE_NAME.workspaceInfo,
  DATABASE_TABLE_NAME.misc,
  DATABASE_TABLE_NAME.noteSnapshots,
  DATABASE_TABLE_NAME.noteSnapshotsContent,
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
  [DATABASE_TABLE_NAME.noteSnapshots]: {
    key: string;
    value: DbRecord<unknown>;
  };
  [DATABASE_TABLE_NAME.noteSnapshotsContent]: {
    key: string;
    value: DbRecord<unknown>;
  };
}

export class IdbDatabaseService extends BaseService implements BaseAppDatabase {
  db!: idb.IDBPDatabase<AppDatabase>;
  private changeBus!: TypedBroadcastBus<DatabaseChange>;

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: {
      openTimeoutMs?: number;
      onDatabaseInvalidated?: () => void;
    } = {},
  ) {
    super(SERVICE_NAME.idbDatabaseService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    this.db = await this.openDatabase();

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

  private async openDatabase(): Promise<idb.IDBPDatabase<AppDatabase>> {
    const logger = this.logger;
    let invalidated = false;
    const reportInvalidation = () => {
      if (invalidated) {
        return;
      }
      invalidated = true;
      this.config.onDatabaseInvalidated?.();
    };
    let gaveUp = false;
    let blockedByOtherTab = false;
    const openPromise = idb.openDB<AppDatabase>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        logger.info('IndexedDB upgrade started', { oldVersion });
        // Every table shares the same key-value shape, so creating whichever
        // stores are missing is a complete migration for any older version.
        for (const table of ALL_TABLES) {
          if (!db.objectStoreNames.contains(table)) {
            db.createObjectStore(table, { keyPath: 'key' });
          }
        }
        logger.info('IndexedDB upgrade completed', { oldVersion });
      },
      blocked(currentVersion, blockedVersion) {
        blockedByOtherTab = true;
        logger.warn('IndexedDB upgrade blocked by another open tab', {
          currentVersion,
          blockedVersion,
        });
      },
      blocking(currentVersion, blockedVersion) {
        logger.warn('Closing IndexedDB for a newer schema', {
          currentVersion,
          blockedVersion,
        });
        reportInvalidation();
      },
      terminated: () => {
        logger.error('IndexedDB connection was unexpectedly terminated');
        reportInvalidation();
      },
    });
    const opened = openPromise.then(
      (db) => {
        if (gaveUp) {
          db.close();
        }
        return { type: 'opened' as const, db };
      },
      (error: unknown) => ({ type: 'failed' as const, error }),
    );

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<'timed-out'>((resolve) => {
      timeoutId = setTimeout(
        () => resolve('timed-out'),
        this.config.openTimeoutMs ?? DEFAULT_OPEN_TIMEOUT_MS,
      );
    });
    let reportAbort: () => void = () => undefined;
    const aborted = new Promise<'aborted'>((resolve) => {
      reportAbort = () => resolve('aborted');
    });
    const onAbort = () => reportAbort();
    this.abortSignal.addEventListener('abort', onAbort, { once: true });
    if (this.abortSignal.aborted) {
      onAbort();
    }

    const result = await Promise.race([opened, timedOut, aborted]);
    clearTimeout(timeoutId);
    this.abortSignal.removeEventListener('abort', onAbort);

    if (result === 'aborted') {
      gaveUp = true;
      throw this.abortSignal.reason ?? new Error('Database open aborted');
    }
    if (result === 'timed-out') {
      gaveUp = true;
      // IndexedDB open requests cannot be cancelled. Close any connection
      // that arrives after startup has failed so a queued request never leaks.
      throw new Error(
        blockedByOtherTab
          ? 'Bangle could not upgrade its database. Close or reload other Bangle tabs, then reload this tab.'
          : 'Bangle could not open its database in time. Reload this tab and try again.',
      );
    }
    if (result.type === 'failed') {
      throw result.error;
    }
    result.db.addEventListener('versionchange', () => {
      logger.warn('Closing IndexedDB connection for a newer schema');
      result.db.close();
      reportInvalidation();
    });
    return result.db;
  }

  private throwError(error: unknown): never {
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
      case DATABASE_TABLE_NAME.noteSnapshots:
        return DATABASE_TABLE_NAME.noteSnapshots;
      case DATABASE_TABLE_NAME.noteSnapshotsContent:
        return DATABASE_TABLE_NAME.noteSnapshotsContent;
      default: {
        const _exhaustiveCheck: never = options.tableName;
        throw new Error(`Unknown table name: ${_exhaustiveCheck}`);
      }
    }
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
    const table = this.getTableName(options);
    try {
      return await getTable(DB_NAME, table, async () => this.db).getAll();
    } catch (error) {
      this.throwError(error);
    }
  }
}

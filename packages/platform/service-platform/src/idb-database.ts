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
      /**
       * Called when a newer app version in another tab requests a database
       * upgrade, i.e. this tab is outdated. The app should block further use
       * of this tab and ask the user to reload it.
       */
      onStaleTab?: () => void;
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

  /**
   * Opens the database, upgrading to DB_VERSION only when the schema is
   * incomplete. The first open is versionless, which can never block, so app
   * startup never hangs — even when a tab running an already-deployed old
   * app version (without cooperative upgrade handling) holds the database.
   *
   * If such an old tab blocks the upgrade, this tab still boots: database
   * operations fail fast until the old tab goes away, at which point the
   * pending upgrade completes and is adopted transparently mid-session.
   * (Note content lives in a separate database and is unaffected.)
   */
  private async openDatabase(): Promise<idb.IDBPDatabase<AppDatabase>> {
    const logger = this.logger;

    // While our own upgrade is pending, a versionchange on the initial
    // connection is that upgrade taking over — not a newer app version — so
    // it must not trigger the stale-tab flow.
    let ownUpgradePending = false;

    const watchVersionChange = (db: idb.IDBPDatabase<AppDatabase>) => {
      db.addEventListener('versionchange', () => {
        // Release the connection so the requesting upgrade can proceed.
        db.close();
        if (ownUpgradePending) {
          logger.info('Released initial connection for the schema upgrade');
        } else {
          // A newer app version in another tab wants to upgrade. Tell the
          // app this tab is stale so it shows a blocking reload prompt
          // instead of failing on the next database operation.
          logger.warn(
            'Closing IndexedDB connection so a newer app version can upgrade',
          );
          this.config.onStaleTab?.();
        }
      });
    };

    const initialDb = await idb.openDB<AppDatabase>(DB_NAME, undefined, {
      terminated: () => {
        logger.error('IndexedDB connection was unexpectedly terminated');
      },
    });
    watchVersionChange(initialDb);

    const schemaComplete = ALL_TABLES.every((table) =>
      initialDb.objectStoreNames.contains(table),
    );
    if (schemaComplete && initialDb.version >= DB_VERSION) {
      return initialDb;
    }

    // The schema needs an upgrade. Our initial connection yields via its
    // versionchange handler above; other tabs on current app versions yield
    // the same way (and show the stale-tab prompt).
    ownUpgradePending = true;
    let reportBlocked: () => void = () => {};
    const blockedSignal = new Promise<'blocked'>((resolve) => {
      reportBlocked = () => resolve('blocked');
    });

    const upgradedPromise = idb.openDB<AppDatabase>(DB_NAME, DB_VERSION, {
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
        logger.warn('IndexedDB upgrade blocked by another open tab', {
          currentVersion,
          blockedVersion,
        });
        reportBlocked();
      },
      terminated: () => {
        logger.error('IndexedDB connection was unexpectedly terminated');
      },
    });

    const adopt = (db: idb.IDBPDatabase<AppDatabase>) => {
      ownUpgradePending = false;
      watchVersionChange(db);
      return db;
    };

    const first = await Promise.race([
      upgradedPromise.then(() => 'upgraded' as const),
      blockedSignal,
    ]);

    if (first === 'upgraded') {
      return adopt(await upgradedPromise);
    }

    // A tab running an old app version (deployed before cooperative upgrade
    // handling existed) holds the database and will not release it. Boot
    // anyway: operations fail fast on the released initial connection, and
    // the moment the old tab closes or reloads, the pending upgrade
    // completes and is adopted below.
    logger.warn(
      'IndexedDB unavailable until other Bangle tabs running an older version are closed or reloaded',
    );
    void upgradedPromise
      .then((db) => {
        this.db = adopt(db);
        logger.info('Adopted upgraded IndexedDB connection');
      })
      .catch((error) => {
        logger.error('Deferred IndexedDB upgrade failed', error);
      });

    return initialDb;
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

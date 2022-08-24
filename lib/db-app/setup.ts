import type { BangleDbSchema, DbRecord } from '@bangle.io/db-key-val';
import { getTable, idb } from '@bangle.io/db-key-val';
import type { WorkspaceInfo } from '@bangle.io/shared-types';

export const DB_NAME = 'bangle-io-db';
export const DB_VERSION = 1;
export const WORKSPACE_INFO_TABLE = 'WorkspaceInfo';
export const DUMMY_TABLE = 'DummyTable';

export const tables = [WORKSPACE_INFO_TABLE, DUMMY_TABLE] as const;

export interface AppDatabase extends BangleDbSchema {
  [WORKSPACE_INFO_TABLE]: {
    key: string;
    value: DbRecord<WorkspaceInfo>;
  };
  [DUMMY_TABLE]: {
    key: string;
    value: DbRecord<{
      foo: string;
    }>;
  };
}

export function setupAppDb() {
  return idb.openDB<AppDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      switch (oldVersion) {
        case 0: {
          for (const table of tables) {
            db.createObjectStore(table, {
              keyPath: 'key',
            });
          }
        }
      }
    },
  });
}

export function getAppDb() {
  const res = setupAppDb();

  return res;
}

export function getWorkspaceInfoTable() {
  return getTable(DB_NAME, WORKSPACE_INFO_TABLE, setupAppDb);
}

import type { BangleDbSchema, DBKeyVal, DbRecord } from '@bangle.io/db-key-val';
import { getTable, idb } from '@bangle.io/db-key-val';
import type { PlainObjEntry } from '@bangle.io/remote-file-sync';

import { EXTENSION_NAME } from './common';

const DB_NAME = EXTENSION_NAME;
const DB_VERSION = 2;
export const LOCAL_ENTRIES_TABLE = 'LOCAL_ENTRIES_TABLE';
const MISC_TABLE = 'MISC_TABLE';
const tables = [LOCAL_ENTRIES_TABLE, MISC_TABLE] as const;

export interface AppDatabase extends BangleDbSchema {
  [LOCAL_ENTRIES_TABLE]: {
    key: string;
    value: DbRecord<PlainObjEntry>;
  };
  [MISC_TABLE]: {
    key: string;
    value: DbRecord<any>;
  };
}

export function openDatabase() {
  return idb.openDB<AppDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      switch (oldVersion) {
        case 0: {
          for (const table of tables) {
            db.createObjectStore(table, {
              keyPath: 'key',
            });
          }
          break;
        }
        case 1: {
          db.createObjectStore(MISC_TABLE, {
            keyPath: 'key',
          });
          break;
        }
      }
    },
  });
}

const miscTable = getTable(DB_NAME, MISC_TABLE, openDatabase);

export function getLocalEntriesTable(): DBKeyVal<PlainObjEntry> {
  return getTable(DB_NAME, LOCAL_ENTRIES_TABLE, openDatabase);
}

export async function getGhToken() {
  const token: string | undefined = await miscTable.get('ghToken');

  return token;
}

export async function updateGhToken(token: string | undefined) {
  if (token) {
    await miscTable.put('ghToken', token);
  } else {
    await miscTable.delete('ghToken');
  }
}

import type { DBSchema } from 'idb';
import * as idb from 'idb';

import type { DbRecord } from '@bangle.io/db-key-val';
import { DBKeyVal } from '@bangle.io/db-key-val';
import type { PlainObjEntry } from '@bangle.io/remote-file-sync';

import { EXTENSION_NAME } from './common';

const DB_NAME = EXTENSION_NAME;
const DB_VERSION = 1;
const LOCAL_ENTRIES_TABLE = 'LOCAL_ENTRIES_TABLE';
const tables = [LOCAL_ENTRIES_TABLE] as const;

export interface AppDatabase extends DBSchema {
  [LOCAL_ENTRIES_TABLE]: {
    key: string;
    value: DbRecord<PlainObjEntry>;
  };
}

export function setupDatabase() {
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

function getTable<R extends typeof tables[number]>(name: R) {
  return new DBKeyVal<AppDatabase[R]['value']['value']>(DB_NAME, name, () =>
    setupDatabase(),
  );
}

export function getLocalEntriesTable() {
  return getTable(LOCAL_ENTRIES_TABLE);
}

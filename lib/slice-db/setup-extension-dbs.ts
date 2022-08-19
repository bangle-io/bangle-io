import * as idb from 'idb';

import { DBKeyVal } from '@bangle.io/db-key-val';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';

import type { ExtensionDB } from './common';

export function setupExtensionDbs(extensionRegistry: ExtensionRegistry) {
  const databases: { [k: string]: ExtensionDB } = {};

  for (const [extName, { tableNames, version }] of Object.entries(
    extensionRegistry.getDatabases(),
  )) {
    databases[extName] = setupDb(extName, version, tableNames);
  }

  return databases;
}

function setupDb<Schema extends { [k: string]: any }>(
  dbName: string,
  version: number,
  storeNames: Array<keyof Schema>,
): ExtensionDB<Schema> {
  const open = () =>
    idb.openDB(dbName, version, {
      upgrade(database, oldVersion, newVersion, transaction) {
        for (const storeName of storeNames) {
          if (typeof storeName === 'string') {
            if (!database.objectStoreNames.contains(storeName)) {
              database.createObjectStore(storeName, {
                keyPath: 'key',
              });
            }
          }
        }
      },
    });

  const tables = storeNames.reduce<any>((prev, cur) => {
    if (typeof cur === 'string') {
      prev[cur] = new DBKeyVal(dbName, cur, open);
    }

    return prev;
  }, {});

  return { tables };
}

import { legacyKeyVal } from './legacy-db';
import { getWorkspaceInfoTable } from './setup';

export async function runMigrations() {
  // Aug 21 2022: migration for moving from idb-keyval to our new database
  await workspacesKeyValMigration();
}

export async function workspacesKeyValMigration() {
  const legacyDb = legacyKeyVal();
  const legacyData = await legacyDb.get('workspaces/2');

  if (!legacyData) {
    console.debug('workspacesKeyValMigration: no legacy data');

    return;
  }

  console.debug(
    'workspacesKeyValMigration: migrating legacy data of count, ',
    legacyData.length,
  );

  const wsInfoTable = getWorkspaceInfoTable();

  for (const data of legacyData) {
    if (
      data &&
      typeof data.name === 'string' &&
      data.metadata &&
      typeof data.type == 'string'
    ) {
      await wsInfoTable.put(data.name, data);
    }
  }
  await legacyDb.del('workspaces/2');

  console.debug('workspacesKeyValMigration: migrating legacy success');
}

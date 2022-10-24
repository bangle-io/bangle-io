import { WorkspaceType } from '@bangle.io/constants';

import { legacyKeyVal } from '../legacy-db';
import { workspacesKeyValMigration } from '../migrations';
import { getWorkspaceInfoTable } from '../setup';

describe('workspacesKeyValMigration', () => {
  test('copies correctly', async () => {
    const legacyDb = legacyKeyVal();
    const wsInfoTable = getWorkspaceInfoTable();

    const legacyItem = {
      lastModified: Date.now(),
      metadata: {
        test: '1234',
      },
      name: 'test-ws-1',
      type: WorkspaceType.Browser,
    };

    await legacyDb.set('workspaces/2', [legacyItem]);

    expect(await legacyDb.get('workspaces/2')).toEqual([legacyItem]);

    await workspacesKeyValMigration();

    expect(await wsInfoTable.getAll()).toEqual([legacyItem]);
    expect(await wsInfoTable.get('test-ws-1')).toEqual(legacyItem);
    expect(await legacyDb.get('workspaces/2')).toBeUndefined();
  });
});

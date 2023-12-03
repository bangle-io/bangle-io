import { silenceAllLoggers, unSilenceAllLoggers } from '@bangle.io/logger';
import { WorkspaceInfo } from '@bangle.io/shared-types';

import { AppDatabaseIndexedDB } from '../index';

function setup() {
  const db = new AppDatabaseIndexedDB();
  return { db };
}

beforeEach(() => {
  silenceAllLoggers();
});

afterEach(() => {
  unSilenceAllLoggers();
});

describe('createWorkspaceInfo', () => {
  it('should create a new workspace info record if it does not already exist', async () => {
    const { db } = setup();
    const workspaceInfo: WorkspaceInfo = {
      name: 'newWorkspace',
      type: 'basic',
      lastModified: 1,
      metadata: {},
      deleted: false,
    };
    await db.updateEntry(workspaceInfo.name, () => ({ value: workspaceInfo }), {
      tableName: 'workspace-info',
    });

    const allWs = (await db.getAllEntries({
      tableName: 'workspace-info',
    })) as WorkspaceInfo[];

    expect(allWs).toEqual([workspaceInfo]);
  });
});

describe('updateEntry', () => {
  it('should not update if callback returns null', async () => {
    const { db } = setup();
    const key = 'testKey';
    await db.updateEntry(key, () => null, {
      tableName: 'misc',
    });
    const entry = await db.getEntry(key, {
      tableName: 'misc',
    });
    expect(entry.found).toBe(false);
  });

  it('should update an existing workspace info record', async () => {
    const { db } = setup();
    const workspaceInfo: WorkspaceInfo = {
      name: 'newWorkspace',
      type: 'basic',
      lastModified: 1,
      metadata: {},
      deleted: false,
    };
    await db.updateEntry(workspaceInfo.name, () => ({ value: workspaceInfo }), {
      tableName: 'workspace-info',
    });

    await db.updateEntry(
      workspaceInfo.name,
      (existing) => {
        if (!existing.found) throw new Error('Workspace info record not found');

        return {
          value: {
            ...(existing.value as any),
            lastModified: 2,
            metadata: { new: 'metadata' },
          },
        };
      },
      {
        tableName: 'workspace-info',
      },
    );

    const newWs = await db.getEntry(workspaceInfo.name, {
      tableName: 'workspace-info',
    });

    expect(newWs.value).toEqual({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {
        new: 'metadata',
      },
      name: 'newWorkspace',
      type: 'basic',
    });
  });
});

describe('deleteWorkspaceInfo', () => {
  it('should delete an existing workspace info record', async () => {
    const { db } = setup();
    const workspaceInfo: WorkspaceInfo = {
      name: 'newWorkspace',
      type: 'basic',
      lastModified: 1,
      metadata: {},
      deleted: false,
    };
    await db.updateEntry(workspaceInfo.name, () => ({ value: workspaceInfo }), {
      tableName: 'workspace-info',
    });
    await db.deleteEntry(workspaceInfo.name, {
      tableName: 'workspace-info',
    });

    const allWs = await db.getAllEntries({
      tableName: 'workspace-info',
    });
    expect(allWs.length).toBe(0);
  });

  it('should successfully delete an existing entry', async () => {
    const { db } = setup();
    const key = 'deleteKey';
    await db.updateEntry(key, () => ({ value: 'deleteTest' }), {
      tableName: 'misc',
    });
    await db.deleteEntry(key, {
      tableName: 'misc',
    });
    const entry = await db.getEntry(key, {
      tableName: 'misc',
    });
    expect(entry.found).toBe(false);
  });
});

describe('getAllEntries', () => {
  it('should retrieve all entries from a specified table', async () => {
    const { db } = setup();
    // Add a test workspace info record
    const workspaceInfo: WorkspaceInfo = {
      name: 'testWorkspace',
      type: 'basic',
      lastModified: 1,
      metadata: {},
      deleted: false,
    };
    await db.updateEntry(workspaceInfo.name, () => ({ value: workspaceInfo }), {
      tableName: 'workspace-info',
    });

    const entries = await db.getAllEntries({
      tableName: 'workspace-info',
    });
    expect(entries.length).toBeGreaterThan(0);
  });
});

describe('getEntry', () => {
  it('should retrieve an existing entry', async () => {
    const { db } = setup();
    const key = 'existingKey';
    // Setup existing entry
    await db.updateEntry(key, () => ({ value: 'testValue' }), {
      tableName: 'misc',
    });

    const entry = await db.getEntry(key, {
      tableName: 'misc',
    });
    expect(entry.found).toBe(true);
    expect(entry.value).toBe('testValue');
  });

  it('should return found as false for non-existing entry', async () => {
    const { db } = setup();
    const entry = await db.getEntry('nonExistingKey', {
      tableName: 'misc',
    });
    expect(entry.found).toBe(false);
  });
});

describe('Table Isolation', () => {
  it('should not affect the misc table when updating workspace-info table', async () => {
    const { db } = setup();
    // Add a record to misc table
    const miscKey = 'miscKey';
    await db.updateEntry(miscKey, () => ({ value: 'miscValue' }), {
      tableName: 'misc',
    });

    // Add a record to workspace-info table
    const workspaceInfo: WorkspaceInfo = {
      name: 'workspaceKey',
      type: 'basic',
      lastModified: 1,
      metadata: {},
      deleted: false,
    };
    await db.updateEntry(workspaceInfo.name, () => ({ value: workspaceInfo }), {
      tableName: 'workspace-info',
    });

    // Check if misc table is unaffected
    const miscEntry = await db.getEntry(miscKey, {
      tableName: 'misc',
    });
    expect(miscEntry.found).toBe(true);
    expect(miscEntry.value).toBe('miscValue');

    // Check if workspace-info table is updated
    const workspaceEntry = await db.getEntry(workspaceInfo.name, {
      tableName: 'workspace-info',
    });
    expect(workspaceEntry.found).toBe(true);
    expect(workspaceEntry.value).toEqual(workspaceInfo);
  });

  it('should not affect the workspace-info table when updating misc table', async () => {
    const { db } = setup();
    // Add a record to workspace-info table
    const workspaceInfo: WorkspaceInfo = {
      name: 'workspaceKey',
      type: 'basic',
      lastModified: 1,
      metadata: {},
      deleted: false,
    };
    await db.updateEntry(workspaceInfo.name, () => ({ value: workspaceInfo }), {
      tableName: 'workspace-info',
    });

    // Add a record to misc table
    const miscKey = 'miscKey';
    await db.updateEntry(miscKey, () => ({ value: 'miscValue' }), {
      tableName: 'misc',
    });

    // Check if workspace-info table is unaffected
    const workspaceEntry = await db.getEntry(workspaceInfo.name, {
      tableName: 'workspace-info',
    });
    expect(workspaceEntry.found).toBe(true);
    expect(workspaceEntry.value).toEqual(workspaceInfo);

    // Check if misc table is updated
    const miscEntry = await db.getEntry(miscKey, {
      tableName: 'misc',
    });
    expect(miscEntry.found).toBe(true);
    expect(miscEntry.value).toBe('miscValue');
  });
});

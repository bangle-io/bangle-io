import { AppDatabaseInMemory } from '@bangle.io/app-database-in-memory';
import { WorkspaceInfo } from '@bangle.io/shared-types';

import { AppDatabase } from '../app-database';

function setupMockDatabase({
  workspaces,
  miscData = new Map<string, unknown>(),
}: {
  workspaces: Map<string, WorkspaceInfo>;
  miscData?: Map<string, unknown>;
}) {
  const mockDatabase = new AppDatabaseInMemory(workspaces, miscData);

  return mockDatabase;
}
const setup = (config = {}) => {
  const onChange = jest.fn();
  const workspaces = new Map<string, WorkspaceInfo>();
  const db = setupMockDatabase({ workspaces });
  const appDatabase = new AppDatabase({ database: db, onChange });

  const getEntrySpy = jest.spyOn(db, 'getEntry');
  const updateEntrySpy = jest.spyOn(db, 'updateEntry');
  const deleteEntrySpy = jest.spyOn(db, 'deleteEntry');
  const getAllEntriesSpy = jest.spyOn(db, 'getAllEntries');

  return {
    appDatabase,
    onChange,
    mockDatabase: db,
    workspaceTable: db.workspaces,
    miscTable: db.miscData,

    getEntrySpy,
    updateEntrySpy,
    deleteEntrySpy,
    getAllEntriesSpy,
  };
};

describe('workspace creation', () => {
  test('createWorkspaceInfo calls database and triggers onChange', async () => {
    const { appDatabase, onChange, mockDatabase } = setup();
    const workspaceInfo = {
      name: 'Test Workspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    const wsInfo = await appDatabase.createWorkspaceInfo(workspaceInfo);

    expect(wsInfo).toEqual({
      ...workspaceInfo,
      lastModified: expect.any(Number),
    });

    expect(mockDatabase.updateEntry).toHaveBeenCalledTimes(1);
    expect(mockDatabase.updateEntry).toHaveBeenCalledWith(
      'Test Workspace',
      expect.any(Function),
      { tableName: 'workspace-info' },
    );

    expect(onChange).toHaveBeenCalledWith({
      type: 'workspace-create',
      payload: {
        ...workspaceInfo,
        lastModified: expect.any(Number),
      },
    });

    expect(mockDatabase.workspaces.get('Test Workspace')).toEqual({
      ...workspaceInfo,
      lastModified: expect.any(Number),
    });
    expect(
      (mockDatabase.workspaces.get('Test Workspace') as any).lastModified,
    ).toBeGreaterThan(1);
  });

  test('createWorkspaceInfo throws error if workspace already exists', async () => {
    const { appDatabase, mockDatabase } = setup();
    const workspaceInfo = {
      name: 'Existing Workspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    // Create a workspace
    await appDatabase.createWorkspaceInfo(workspaceInfo);

    // Attempt to create the same workspace again
    await expect(
      appDatabase.createWorkspaceInfo(workspaceInfo),
    ).rejects.toThrow('Workspace with name Existing Workspace already exists');

    expect(mockDatabase.updateEntry).toHaveBeenCalledTimes(2);
    expect(mockDatabase.updateEntry).toHaveBeenNthCalledWith(
      1,
      'Existing Workspace',
      expect.any(Function),
      { tableName: 'workspace-info' },
    );
    expect(mockDatabase.updateEntry).toHaveBeenNthCalledWith(
      2,
      'Existing Workspace',
      expect.any(Function),
      { tableName: 'workspace-info' },
    );
  });
});

describe('workspace deletion', () => {
  test('deleteWorkspaceInfo updates workspace and triggers onChange', async () => {
    const { appDatabase, onChange, mockDatabase } = setup();
    const workspaceName = 'Test Workspace';

    const workspaceInfo = {
      name: workspaceName,
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);

    await appDatabase.deleteWorkspaceInfo(workspaceName);

    expect(mockDatabase.updateEntry).toHaveBeenCalledWith(
      workspaceName,
      expect.any(Function),
      { tableName: 'workspace-info' },
    );
    expect(onChange).toHaveBeenCalledWith({
      type: 'workspace-delete',
      payload: { name: workspaceName },
    });
  });

  test('deleteWorkspaceInfo sets workspace as deleted', async () => {
    const { appDatabase, mockDatabase, onChange, workspaceTable } = setup();
    const workspaceName = 'Test Workspace';

    const workspaceInfo = {
      name: workspaceName,
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);
    await appDatabase.deleteWorkspaceInfo(workspaceName);

    expect(
      (Array.from(workspaceTable.values())?.[0] as WorkspaceInfo)?.deleted,
    ).toBe(true);

    const result = await appDatabase.getWorkspaceInfo(workspaceName, {
      allowDeleted: true,
    });

    expect(result?.deleted).toBe(true);

    expect(onChange).toHaveBeenCalledWith({
      type: 'workspace-delete',
      payload: { name: workspaceName },
    });

    const result2 = await appDatabase.getWorkspaceInfo(workspaceName, {
      allowDeleted: false,
    });

    expect(result2).toBeUndefined();
  });
});
describe('workspace metadata', () => {
  test('getWorkspaceInfo calls database with correct parameters', async () => {
    const { appDatabase, mockDatabase, workspaceTable } = setup();
    const workspaceName = 'Test Workspace';

    const workspaceInfo = {
      name: workspaceName,
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);

    expect(workspaceTable.size).toBe(1);

    await appDatabase.getWorkspaceInfo(workspaceName);

    expect(mockDatabase.getEntry).toHaveBeenCalledWith(workspaceName, {
      tableName: 'workspace-info',
    });
  });

  test('updateWorkspaceInfo updates workspace and triggers onChange', async () => {
    const { appDatabase, onChange, mockDatabase } = setup();
    const workspaceName = 'Test Workspace';
    const updateFunction = jest.fn((info) => ({
      ...info,
      metadata: { updated: true },
    }));

    const workspaceInfo = {
      name: workspaceName,
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);

    const result = await appDatabase.updateWorkspaceInfo(
      workspaceName,
      updateFunction,
    );

    expect(result).toEqual({
      ...workspaceInfo,
      lastModified: expect.any(Number),
      metadata: {
        updated: true,
      },
    });

    expect(mockDatabase.updateEntry).toHaveBeenCalledWith(
      workspaceName,
      expect.any(Function),
      { tableName: 'workspace-info' },
    );
    expect(onChange).toHaveBeenCalledWith({
      type: 'workspace-update',
      payload: { name: workspaceName },
    });
  });

  test('getAllWorkspaces calls database with correct parameters', async () => {
    const { appDatabase, mockDatabase } = setup();

    await appDatabase.getAllWorkspaces();

    expect(mockDatabase.getAllEntries).toHaveBeenCalledWith({
      tableName: 'workspace-info',
    });
  });

  test('updateWorkspaceMetadata updates metadata and triggers onChange', async () => {
    const { appDatabase, onChange, mockDatabase } = setup();
    const workspaceName = 'Test Workspace';
    const metadataUpdateFunction = jest.fn((metadata) => ({
      ...metadata,
      updated: true,
    }));
    const workspaceInfo = {
      name: workspaceName,
      metadata: {},
      type: 'local',
      lastModified: 1,
    };
    await appDatabase.createWorkspaceInfo(workspaceInfo);

    const result = await appDatabase.updateWorkspaceInfo(
      workspaceName,
      metadataUpdateFunction,
    );

    expect(mockDatabase.updateEntry).toHaveBeenCalledWith(
      workspaceName,
      expect.any(Function),
      { tableName: 'workspace-info' },
    );
    expect(onChange).toHaveBeenCalledWith({
      type: 'workspace-update',
      payload: { name: workspaceName },
    });
  });

  test('updateWorkspaceMetadata throws if workspace does not exist', async () => {
    const { appDatabase, mockDatabase, workspaceTable } = setup();
    const workspaceName = 'Test Workspace';
    const metadataUpdateFunction = jest.fn();

    await expect(
      appDatabase.updateWorkspaceInfo(workspaceName, metadataUpdateFunction),
    ).rejects.toThrow('Workspace with name Test Workspace does not exist');

    expect(workspaceTable.size).toBe(0);
  });
});

describe('getWorkspaceInfo', () => {
  test('returns undefined for non-existent workspace', async () => {
    const { appDatabase } = setup();
    const nonExistentWorkspaceName = 'NonExistentWorkspace';
    const result = await appDatabase.getWorkspaceInfo(nonExistentWorkspaceName);
    expect(result).toBeUndefined();
  });

  test('returns workspace info for existing workspace', async () => {
    const { appDatabase } = setup();
    const workspaceInfo = {
      name: 'ExistingWorkspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);
    const result = await appDatabase.getWorkspaceInfo('ExistingWorkspace');
    expect(result?.name).toEqual(workspaceInfo.name);
  });

  test('returns undefined for deleted workspace when allowDeleted is false', async () => {
    const { appDatabase } = setup();
    const workspaceInfo = {
      name: 'DeletedWorkspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);
    await appDatabase.deleteWorkspaceInfo('DeletedWorkspace');
    const result = await appDatabase.getWorkspaceInfo('DeletedWorkspace');
    expect(result).toBeUndefined();
  });

  test('returns workspace info for deleted workspace when allowDeleted is true', async () => {
    const { appDatabase } = setup();
    const workspaceInfo = {
      name: 'DeletedWorkspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);
    await appDatabase.deleteWorkspaceInfo('DeletedWorkspace');
    const result = await appDatabase.getWorkspaceInfo('DeletedWorkspace', {
      allowDeleted: true,
    });

    expect(result?.name).toEqual(workspaceInfo.name);
    expect(result?.type).toEqual(workspaceInfo.type);
    expect(result?.deleted).toEqual(true);
  });

  test('returns undefined for workspace of a different type when type option is set', async () => {
    const { appDatabase } = setup();
    const workspaceInfo = {
      name: 'LocalWorkspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);
    const result = await appDatabase.getWorkspaceInfo('LocalWorkspace', {
      type: 'remote',
    });
    expect(result).toBeUndefined();
  });

  test('returns workspace info for workspace of the specified type when type option is set', async () => {
    const { appDatabase } = setup();
    const workspaceInfo = {
      name: 'LocalWorkspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);
    const result = await appDatabase.getWorkspaceInfo('LocalWorkspace', {
      type: 'local',
    });
    expect(result?.name).toEqual(workspaceInfo.name);
    expect(result?.type).toEqual(workspaceInfo.type);
  });
});

import { AppDatabase } from '@bangle.io/app-database';
import { WorkspaceInfo } from '@bangle.io/shared-types';

import { AppDatabaseInMemory } from '../index';

function setupMockDatabase({
  workspaces,
}: {
  workspaces: Map<string, WorkspaceInfo>;
}) {
  const mockDatabase = new AppDatabaseInMemory(workspaces);

  return mockDatabase;
}
const setup = (config = {}) => {
  const onChange = jest.fn();
  const workspaces = new Map<string, WorkspaceInfo>();
  const db = setupMockDatabase({ workspaces });

  const appDatabase = new AppDatabase({ database: db, onChange });

  const mockUpdateWorkspaceInfo = jest.spyOn(db, 'updateWorkspaceInfo');
  const mockGetAllWorkspaces = jest.spyOn(db, 'getAllWorkspaces');
  const mockGetWorkspaceInfo = jest.spyOn(db, 'getWorkspaceInfo');
  const mockCreateWorkspaceInfo = jest.spyOn(db, 'createWorkspaceInfo');

  return {
    appDatabase,
    onChange,
    mockDatabase: db,
    workspaces,
    mockUpdateWorkspaceInfo,
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

    await appDatabase.createWorkspaceInfo(workspaceInfo);

    expect(mockDatabase.createWorkspaceInfo).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      type: 'workspace-create',
      payload: workspaceInfo,
    });
  });
});

describe('workspace deletion', () => {
  test('deleteWorkspaceInfo updates workspace and triggers onChange', async () => {
    const { appDatabase, onChange, mockDatabase } = setup();
    const workspaceName = 'Test Workspace';

    const workspaceInfo = {
      name: 'Test Workspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);

    await appDatabase.deleteWorkspaceInfo(workspaceName);

    expect(mockDatabase.updateWorkspaceInfo).toHaveBeenCalledWith(
      workspaceName,
      expect.any(Function),
    );
    expect(onChange).toHaveBeenCalledWith({
      type: 'workspace-delete',
      payload: { name: workspaceName },
    });
  });

  test('deleteWorkspaceInfo sets workspace as deleted', async () => {
    const { appDatabase, mockDatabase, onChange, workspaces } = setup();
    const workspaceName = 'Test Workspace';

    const workspaceInfo = {
      name: 'Test Workspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);

    await appDatabase.deleteWorkspaceInfo(workspaceName);

    expect(Array.from(workspaces.values())?.[0]?.deleted).toBe(true);
    // Check if updateWorkspaceInfo was called correctly
    expect(mockDatabase.updateWorkspaceInfo).toHaveBeenCalledWith(
      workspaceName,
      expect.any(Function),
    );

    const result = await appDatabase.getWorkspaceInfo(workspaceName, {
      allowDeleted: true,
    });

    expect(result?.deleted).toBe(true);

    // Check if onChange was called with the correct payload
    expect(onChange).toHaveBeenCalledWith({
      type: 'workspace-delete',
      payload: { name: workspaceName },
    });
  });
});

describe('workspace metadata', () => {
  test('getWorkspaceInfo calls database with correct parameters', async () => {
    const { appDatabase, mockDatabase } = setup();
    const workspaceName = 'Test Workspace';

    const workspaceInfo = {
      name: 'Test Workspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);

    await appDatabase.getWorkspaceInfo(workspaceName);

    expect(mockDatabase.getWorkspaceInfo).toHaveBeenCalledWith(
      workspaceName,
      undefined,
    );
  });

  test('updateWorkspaceInfo updates workspace and triggers onChange', async () => {
    const { appDatabase, onChange, mockDatabase } = setup();
    const workspaceName = 'Test Workspace';
    const updateFunction = jest.fn((info) => ({ ...info, updated: true }));

    const workspaceInfo = {
      name: 'Test Workspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };

    await appDatabase.createWorkspaceInfo(workspaceInfo);

    await appDatabase.updateWorkspaceInfo(workspaceName, updateFunction);

    expect(mockDatabase.updateWorkspaceInfo).toHaveBeenCalledWith(
      workspaceName,
      expect.any(Function),
    );
    expect(onChange).toHaveBeenCalledWith({
      type: 'workspace-update',
      payload: { name: workspaceName },
    });
  });

  test('getAllWorkspaces calls database with correct parameters', async () => {
    const { appDatabase, mockDatabase } = setup();

    await appDatabase.getAllWorkspaces();

    expect(mockDatabase.getAllWorkspaces).toHaveBeenCalledWith(undefined);
  });

  test('updateWorkspaceMetadata updates metadata and triggers onChange', async () => {
    const { appDatabase, onChange, mockDatabase } = setup();
    const workspaceName = 'Test Workspace';
    const metadataUpdateFunction = jest.fn((metadata) => ({
      ...metadata,
      updated: true,
    }));
    const workspaceInfo = {
      name: 'Test Workspace',
      metadata: {},
      type: 'local',
      lastModified: 1,
    };
    await appDatabase.createWorkspaceInfo(workspaceInfo);

    const result = await appDatabase.updateWorkspaceMetadata(
      workspaceName,
      metadataUpdateFunction,
    );

    expect(result).toBe(true);
    expect(mockDatabase.updateWorkspaceInfo).toHaveBeenCalledWith(
      workspaceName,
      expect.any(Function),
    );
    expect(onChange).toHaveBeenCalledWith({
      type: 'workspace-update',
      payload: { name: workspaceName },
    });
  });

  test('updateWorkspaceMetadata returns false if workspace does not exist', async () => {
    const { appDatabase, mockDatabase, mockUpdateWorkspaceInfo } = setup();
    const workspaceName = 'Test Workspace';
    const metadataUpdateFunction = jest.fn();

    await expect(
      appDatabase.updateWorkspaceMetadata(
        workspaceName,
        metadataUpdateFunction,
      ),
    ).rejects.toThrow('Workspace not found');

    expect(mockUpdateWorkspaceInfo).not.toHaveBeenCalled();
  });
});

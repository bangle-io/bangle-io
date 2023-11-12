import { WorkspaceInfo } from '@bangle.io/shared-types';

import { AppDatabase } from '../app-database';
import { BaseAppDatabase } from '../base';

function setupMockDatabase({
  workspaces,
}: {
  workspaces: Record<string, WorkspaceInfo>;
}) {
  const mockDatabase = {
    name: 'mock',
    createWorkspaceInfo: jest.fn(async (info) => {
      workspaces[info.name] = { ...info, deleted: false };
    }),
    getWorkspaceInfo: jest.fn(async (wsName, options = {}) => {
      const workspace = workspaces[wsName];
      if (workspace && (!workspace.deleted || options.allowDeleted)) {
        return workspace;
      }
      return undefined;
    }),
    updateWorkspaceInfo: jest.fn(async (wsName, updateFn) => {
      let current = workspaces[wsName];
      if (current) {
        workspaces[wsName] = {
          ...current,
          ...updateFn(current),
        };
      }
    }),
    getAllWorkspaces: jest.fn(async (options = {}) => {
      return Object.values(workspaces).filter(
        (ws) => options.allowDeleted ?? !ws.deleted,
      );
    }),
  } satisfies BaseAppDatabase;

  return mockDatabase;
}
const setup = (config = {}) => {
  const onChange = jest.fn();
  const workspaces: Record<string, WorkspaceInfo> = {};
  const db = setupMockDatabase({ workspaces });

  const appDatabase = new AppDatabase({ database: db, onChange });

  return { appDatabase, onChange, mockDatabase: db, workspaces };
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

    expect(Object.values(workspaces)?.[0]?.deleted).toBe(true);
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

  test('getWorkspaceMetadata calls database with correct parameters', async () => {
    const { appDatabase, mockDatabase } = setup();
    const workspaceName = 'Test Workspace';

    await appDatabase.getWorkspaceMetadata(workspaceName);

    expect(mockDatabase.getWorkspaceInfo).toHaveBeenCalledWith(
      workspaceName,
      undefined,
    );
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
    const { appDatabase, mockDatabase } = setup();
    const workspaceName = 'Test Workspace';
    const metadataUpdateFunction = jest.fn();

    const result = await appDatabase.updateWorkspaceMetadata(
      workspaceName,
      metadataUpdateFunction,
    );

    expect(result).toBe(false);
    expect(mockDatabase.updateWorkspaceInfo).not.toHaveBeenCalled();
  });
});

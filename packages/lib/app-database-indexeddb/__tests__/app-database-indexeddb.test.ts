import { WorkspaceInfo } from '@bangle.io/shared-types';

import { AppDatabaseIndexedDB } from '../index';
import { logger } from '../logger';

function setup() {
  const db = new AppDatabaseIndexedDB();
  return { db };
}

beforeEach(() => {
  logger.silence();
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
    await db.createWorkspaceInfo(workspaceInfo);

    const allWs = await db.getAllWorkspaces();
    expect(allWs[0]?.lastModified).toBeGreaterThan(workspaceInfo.lastModified);

    expect(
      allWs.map((item) => ({
        ...item,
        lastModified: 1,
      })),
    ).toEqual([workspaceInfo]);
  });
  it('should throw an error if the workspace info record already exists', async () => {
    const { db } = setup();
    const workspaceInfo: WorkspaceInfo = {
      name: 'newWorkspace',
      type: 'basic',
      lastModified: 1,
      metadata: {},
      deleted: false,
    };
    await db.createWorkspaceInfo(workspaceInfo);

    await expect(db.createWorkspaceInfo(workspaceInfo)).rejects.toThrow(
      'Error creating workspace',
    );
  });
});

describe('updateWorkspaceInfo', () => {
  it('should update an existing workspace info record', async () => {
    const { db } = setup();
    const workspaceInfo: WorkspaceInfo = {
      name: 'newWorkspace',
      type: 'basic',
      lastModified: 1,
      metadata: {},
      deleted: false,
    };
    await db.createWorkspaceInfo(workspaceInfo);

    await db.updateWorkspaceInfo(workspaceInfo.name, (wsInfo) => ({
      ...wsInfo,
      lastModified: 2,
      metadata: { new: 'metadata' },
    }));

    const newWs = await db.getWorkspaceInfo(workspaceInfo.name);

    expect(newWs).toEqual({
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {
        new: 'metadata',
      },
      name: 'newWorkspace',
      type: 'basic',
    });
  });

  it('should throw an error if the workspace info record does not exist', async () => {
    const { db } = setup();
    const workspaceInfo: WorkspaceInfo = {
      name: 'newWorkspace',
      type: 'basic',
      lastModified: 1,
      metadata: {},
      deleted: false,
    };

    await expect(
      db.updateWorkspaceInfo(workspaceInfo.name, () => workspaceInfo),
    ).rejects.toThrow('Error creating workspace');
  });
});

// describe('deleteWorkspaceInfo', () => {
//   it('should delete an existing workspace info record', async () => {
//     const { db } = setup();
//     const workspaceInfo: WorkspaceInfo = {
//       name: 'newWorkspace',
//       type: 'basic',
//       lastModified: 1,
//       metadata: {},
//       deleted: false,
//     };
//     await db.createWorkspaceInfo(workspaceInfo);

//     await db.deleteWorkspaceInfo(workspaceInfo.name);

//     const allWs = await db.getAllWorkspaces();
//     expect(allWs.length).toBe(0);
//   });

//   it('should throw an error if the workspace info record does not exist', async () => {
//     const { db } = setup();

//     await expect(
//       db.deleteWorkspaceInfo('nonExistentWorkspace'),
//     ).rejects.toThrow('Workspace info record not found');
//   });
// });

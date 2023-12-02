import { AppDatabase } from '@bangle.io/app-database';
import { AppDatabaseIndexedDB } from '@bangle.io/app-database-indexeddb';

import { logger } from '../logger';
import { Workspace } from '../workspace';

beforeAll(() => {
  logger.silence();
});

describe('Workspace ', () => {
  const setup = async ({ wsName = 'test-ws' }: { wsName?: string } = {}) => {
    const onDbChange = jest.fn();

    const database = new AppDatabase({
      database: new AppDatabaseIndexedDB(),
      onChange: onDbChange,
    });

    const wsInfo = await database.createWorkspaceInfo({
      name: wsName,
      type: 'browser',
      metadata: {},
    });

    if (!wsInfo) {
      throw new Error('Could not create workspace');
    }

    const workspace = await Workspace.create({
      database,
      wsName,
    });

    return {
      workspace,
    };
  };

  it('should create a new Workspace instance', async () => {
    const { workspace } = await setup({
      wsName: 'test-ws',
    });
    expect(workspace).toBeInstanceOf(Workspace);
  });

  it('should throw an error if workspace is not found during initialization', async () => {
    await expect(
      Workspace.create({
        database: new AppDatabase({
          database: new AppDatabaseIndexedDB(),
          onChange: jest.fn(),
        }),
        wsName: 'nonexistent-ws',
      }),
    ).rejects.toThrow('Workspace nonexistent-ws not found');
  });

  it('should get workspace metadata', async () => {
    const { workspace } = await setup();
    const metadata = await workspace.getWorkspaceMetadata();
    expect(metadata).toEqual({});
  });

  it('should update workspace metadata', async () => {
    const { workspace } = await setup();
    const newMetadata = { key: 'value' };
    await workspace.updateWorkspaceMetadata(newMetadata);
    const updatedMetadata = await workspace.getWorkspaceMetadata();
    expect(updatedMetadata).toEqual(newMetadata);
  });

  it('should return true for supported file types', async () => {
    const { workspace } = await setup();
    expect(workspace.isFileTypeSupported({ extension: '.md' })).toBeTruthy();
    expect(workspace.isFileTypeSupported({ extension: 'md' })).toBeFalsy();
    expect(workspace.isFileTypeSupported({ extension: '.svg' })).toBeFalsy();
  });

  it('should write a file', async () => {
    const wsName = 'test-ws';
    const { workspace } = await setup({
      wsName,
    });
    const file = new File(['content'], 'file.md', { type: 'text/markdown' });
    await workspace.writeFile('test-ws:path/to/file.md', file);

    const fileContent = await workspace.readFileAsText(
      'test-ws:path/to/file.md',
    );
    expect(fileContent).toEqual('content');
  });

  it('should delete a file', async () => {
    const wsName = 'test-ws';
    const { workspace } = await setup({
      wsName,
    });

    const file = new File(['content'], 'file.md', { type: 'text/markdown' });
    await workspace.writeFile('test-ws:path/to/file.md', file);

    expect(
      await workspace.readFileAsText('test-ws:path/to/file.md'),
    ).toBeDefined();

    await workspace.deleteFile('test-ws:path/to/file.md');

    expect(await workspace.readFileAsText('test-ws:path/to/file.md')).toBe(
      undefined,
    );
  });

  it('lists all files', async () => {
    const wsName = 'test-ws';
    const { workspace } = await setup({
      wsName,
    });

    const fileA = new File(['contentA'], 'fileA.md', { type: 'text/markdown' });
    const fileB = new File(['contentB'], 'fileB.md', { type: 'text/markdown' });
    const fileC = new File(['contentC'], 'fileB.xyz', { type: 'text/unknown' });
    await workspace.writeFile('test-ws:path/to/fileA.md', fileA);
    await workspace.writeFile('test-ws:path/to/fileB.md', fileB);
    await workspace.writeFile('test-ws:path/to/fileC.xyz', fileC);

    const files = await workspace.listFiles();
    expect(files).toEqual([
      'test-ws:path/to/fileA.md',
      'test-ws:path/to/fileB.md',
    ]);
  });
});

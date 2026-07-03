import {
  FILE_STORAGE_MAX_FILE_SIZE_BYTES,
  WORKSPACE_STORAGE_TYPE,
} from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import type { BaseFileStorageService } from '@bangle.io/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileSystemService } from '../file-system-service';

describe('FileSystemService.getStorageServiceForType', () => {
  const mockBrowserStorage = {
    type: 'browser',
  } as unknown as BaseFileStorageService;
  const mockNativeFSStorage = {
    type: 'nativefs',
  } as unknown as BaseFileStorageService;

  const mockFileStorageServices = {
    [WORKSPACE_STORAGE_TYPE.Browser]: mockBrowserStorage,
    [WORKSPACE_STORAGE_TYPE.NativeFS]: mockNativeFSStorage,
  };

  it('should return browser storage service', () => {
    const result = FileSystemService._getStorageServiceForType(
      WORKSPACE_STORAGE_TYPE.Browser,
      mockFileStorageServices,
      'test-ws',
    );

    expect(result).toBe(mockBrowserStorage);
  });

  it('should return nativefs storage service', () => {
    const result = FileSystemService._getStorageServiceForType(
      WORKSPACE_STORAGE_TYPE.NativeFS,
      mockFileStorageServices,
      'test-ws',
    );

    expect(result).toBe(mockNativeFSStorage);
  });

  it.each([
    WORKSPACE_STORAGE_TYPE.Help,
    WORKSPACE_STORAGE_TYPE.PrivateFS,
    WORKSPACE_STORAGE_TYPE.Github,
  ])('should throw error for unsupported type: %s', (type) => {
    expect(() =>
      FileSystemService._getStorageServiceForType(
        type,
        mockFileStorageServices,
        'test-ws',
      ),
    ).toThrow('workspace is not supported for file operations');
  });

  it('should throw error for unknown type', () => {
    expect(() =>
      FileSystemService._getStorageServiceForType(
        'invalid-type' as any,
        mockFileStorageServices,
        'test-ws',
      ),
    ).toThrow('workspace is not supported for file operations');
  });
});

describe('FileSystemService', () => {
  let controller: AbortController;

  const TEST_WS_NAME = 'test-workspace';
  const EXISTING_FILE = 'test-workspace:exists.md';
  const NON_EXISTING_FILE = 'test-workspace:not-exists.md';

  function fileWithSize(file: File, size: number): File {
    Object.defineProperty(file, 'size', { value: size });
    return file;
  }

  async function setupFileSystemTest({
    controller = new AbortController(),
  } = {}) {
    const testEnv = createTestEnvironment({ controller });

    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    await services.workspaceOps.createWorkspaceInfo({
      name: TEST_WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });

    await services.fileSystem.createTextFile(EXISTING_FILE, 'Test content');

    const storage: BaseFileStorageService = services.fileStorageMemory;

    return {
      fileSystem: services.fileSystem,
      store: testEnv.store,
      workspaceOps: services.workspaceOps,
      storage,
      controller,
    };
  }

  beforeEach(() => {
    controller = new AbortController();
  });

  afterEach(() => {
    controller.abort();
  });

  it('exists should check if a file exists', async () => {
    const { fileSystem } = await setupFileSystemTest({ controller });

    const existsResult = await fileSystem.exists(EXISTING_FILE);
    expect(existsResult).toBe(true);

    const notExistsResult = await fileSystem.exists(NON_EXISTING_FILE);
    expect(notExistsResult).toBe(false);
  });

  it('exposes the active storage provider file-size limit', async () => {
    const { fileSystem } = await setupFileSystemTest({ controller });

    await expect(fileSystem.getMaxFileSizeBytes(EXISTING_FILE)).resolves.toBe(
      FILE_STORAGE_MAX_FILE_SIZE_BYTES.memory,
    );
  });

  it('rejects creates larger than the active storage provider limit', async () => {
    const { fileSystem, storage } = await setupFileSystemTest({ controller });
    const wsPath = `${TEST_WS_NAME}:too-large.bin`;
    Object.defineProperty(storage, 'maxFileSizeBytes', { value: 4 });

    await expect(
      fileSystem.createFile(
        wsPath,
        fileWithSize(
          new File(['12345'], 'too-large.bin', {
            type: 'application/octet-stream',
          }),
          5,
        ),
      ),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file:size-too-large',
        payload: expect.objectContaining({
          fileName: 'too-large.bin',
          fileSizeBytes: 5,
          maxFileSizeBytes: 4,
          wsPath,
        }),
      }),
    });

    await expect(fileSystem.exists(wsPath)).resolves.toBe(false);
  });

  it('rejects writes larger than the active storage provider limit without mutating existing content', async () => {
    const { fileSystem, storage } = await setupFileSystemTest({ controller });
    Object.defineProperty(storage, 'maxFileSizeBytes', { value: 4 });

    await expect(
      fileSystem.writeFile(
        EXISTING_FILE,
        fileWithSize(new File(['12345'], 'exists.md'), 5),
      ),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file:size-too-large',
        payload: expect.objectContaining({
          fileName: 'exists.md',
          fileSizeBytes: 5,
          maxFileSizeBytes: 4,
          wsPath: EXISTING_FILE,
        }),
      }),
    });

    await expect(fileSystem.readFileAsText(EXISTING_FILE)).resolves.toBe(
      'Test content',
    );
  });

  it('increments file-list revision for file list changes', async () => {
    const { fileSystem, store } = await setupFileSystemTest({ controller });
    const readRevision = () => store.get(fileSystem.$fileListRevisionCount);

    const initialRevision = readRevision();

    await fileSystem.createTextFile(
      'test-workspace:created-after-settings.md',
      'Test content',
    );
    expect(readRevision()).toBeGreaterThan(initialRevision);

    // A content update (editing/saving an existing note) must NOT bump the
    // revision: the file list is unchanged, so the settings note-count list must
    // not refetch every workspace on each save.
    const beforeContentUpdate = readRevision();
    await fileSystem.writeFile(
      'test-workspace:created-after-settings.md',
      new File(['Updated content'], 'created-after-settings', {
        type: 'text/plain',
      }),
    );
    expect(readRevision()).toBe(beforeContentUpdate);

    const afterCreateRevision = readRevision();
    await fileSystem.renameFile({
      oldWsPath: 'test-workspace:created-after-settings.md',
      newWsPath: 'test-workspace:renamed-after-settings.md',
    });
    expect(readRevision()).toBeGreaterThan(afterCreateRevision);

    const afterRenameRevision = readRevision();
    await fileSystem.deleteFile('test-workspace:renamed-after-settings.md');
    expect(readRevision()).toBeGreaterThan(afterRenameRevision);

    const afterDeleteRevision = readRevision();
    store.set(fileSystem.$fileForceUpdateCount, (count) => count + 1);
    expect(readRevision()).toBeGreaterThan(afterDeleteRevision);
  });

  it('lists note files separately from sidebar-visible workspace files', async () => {
    const { fileSystem } = await setupFileSystemTest({ controller });

    await fileSystem.createTextFile(
      `${TEST_WS_NAME}:src/component.tsx`,
      'export function Component() { return null; }',
    );
    await fileSystem.createFile(
      `${TEST_WS_NAME}:assets/report.pdf`,
      new File(['pdf'], 'report.pdf', { type: 'application/pdf' }),
    );
    await fileSystem.createTextFile(
      `${TEST_WS_NAME}:node_modules/pkg/index.ts`,
      'export const ignored = true;',
    );
    await fileSystem.createTextFile(
      `${TEST_WS_NAME}:.hidden.md`,
      'hidden note',
    );
    await fileSystem.createFile(
      `${TEST_WS_NAME}:assets/archive.bin`,
      new File(['binary'], 'archive.bin', {
        type: 'application/octet-stream',
      }),
    );

    await expect(fileSystem.listFiles(TEST_WS_NAME)).resolves.toEqual([
      EXISTING_FILE,
    ]);
    await expect(fileSystem.listWorkspaceFiles(TEST_WS_NAME)).resolves.toEqual([
      `${TEST_WS_NAME}:assets/archive.bin`,
      `${TEST_WS_NAME}:assets/report.pdf`,
      EXISTING_FILE,
      `${TEST_WS_NAME}:src/component.tsx`,
    ]);
  });

  it('rolls back completed batch renames when a later rename fails', async () => {
    const { fileSystem, storage } = await setupFileSystemTest({ controller });
    const first = `${TEST_WS_NAME}:old/one.md`;
    const second = `${TEST_WS_NAME}:old/two.md`;
    await fileSystem.createTextFile(first, 'one');
    await fileSystem.createTextFile(second, 'two');

    // Fail at the real storage boundary so the test exercises the genuine
    // partial-failure path regardless of how the batch is structured internally.
    const renameFile = storage.renameFile.bind(storage);
    const failingRename: typeof storage.renameFile = (wsPath, options) => {
      if (wsPath === second) {
        throw new Error('rename failed');
      }

      return renameFile(wsPath, options);
    };
    vi.spyOn(storage, 'renameFile').mockImplementation(failingRename);

    await expect(
      fileSystem.renameFiles([
        { oldWsPath: first, newWsPath: `${TEST_WS_NAME}:new/one.md` },
        { oldWsPath: second, newWsPath: `${TEST_WS_NAME}:new/two.md` },
      ]),
    ).rejects.toThrow('rename failed');

    await expect(fileSystem.readFileAsText(first)).resolves.toBe('one');
    await expect(fileSystem.readFileAsText(second)).resolves.toBe('two');
    await expect(
      fileSystem.readFileAsText(`${TEST_WS_NAME}:new/one.md`),
    ).resolves.toBeUndefined();
  });

  it('restores completed batch deletes when a later delete fails', async () => {
    const { fileSystem, storage } = await setupFileSystemTest({ controller });
    const first = `${TEST_WS_NAME}:old/one.md`;
    const second = `${TEST_WS_NAME}:old/two.md`;
    await fileSystem.createTextFile(first, 'one');
    await fileSystem.createTextFile(second, 'two');

    const deleteFile = storage.deleteFile.bind(storage);
    const failingDelete: typeof storage.deleteFile = (wsPath, options) => {
      if (wsPath === second) {
        throw new Error('delete failed');
      }

      return deleteFile(wsPath, options);
    };
    vi.spyOn(storage, 'deleteFile').mockImplementation(failingDelete);

    await expect(fileSystem.deleteFiles([first, second])).rejects.toThrow(
      'delete failed',
    );

    await expect(fileSystem.readFileAsText(first)).resolves.toBe('one');
    await expect(fileSystem.readFileAsText(second)).resolves.toBe('two');
  });

  it('announces batch deletes in one burst after every durable write, so the workspace re-lists once', async () => {
    const { fileSystem, store, storage } = await setupFileSystemTest({
      controller,
    });
    const paths = [
      `${TEST_WS_NAME}:batch/a.md`,
      `${TEST_WS_NAME}:batch/b.md`,
      `${TEST_WS_NAME}:batch/c.md`,
    ];
    for (const wsPath of paths) {
      await fileSystem.createTextFile(wsPath, 'x');
    }

    const realDelete = storage.deleteFile.bind(storage);
    // Record the delete-change counter observed *during* each durable delete.
    const deleteCountDuringWrites: number[] = [];
    const recordingDelete: typeof storage.deleteFile = (wsPath, options) => {
      deleteCountDuringWrites.push(store.get(fileSystem.$fileDeleteCount));
      return realDelete(wsPath, options);
    };
    vi.spyOn(storage, 'deleteFile').mockImplementation(recordingDelete);

    const before = store.get(fileSystem.$fileDeleteCount);
    await fileSystem.deleteFiles(paths);

    // No change is announced while the durable deletes run — the counter stays
    // frozen — so the workspace does not re-scan once per file mid-batch...
    expect(deleteCountDuringWrites).toEqual([before, before, before]);
    // ...and all three land together afterwards.
    expect(store.get(fileSystem.$fileDeleteCount)).toBe(before + paths.length);
  });
});

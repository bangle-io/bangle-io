import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import type { BaseFileStorageService } from '@bangle.io/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  async function setupFileSystemTest({
    controller = new AbortController(),
  } = {}) {
    const testEnv = createTestEnvironment({ controller });
    testEnv.setDefaultConfig();

    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    await services.workspaceOps.createWorkspaceInfo({
      name: TEST_WS_NAME,
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });

    await services.fileSystem.createTextFile(EXISTING_FILE, 'Test content');

    return {
      fileSystem: services.fileSystem,
      workspaceOps: services.workspaceOps,
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
});

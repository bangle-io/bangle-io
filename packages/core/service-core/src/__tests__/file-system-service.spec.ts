import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import type { BaseFileStorageService } from '@bangle.io/types';
import { describe, expect, it } from 'vitest';
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

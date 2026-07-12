/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isNativeFsError, NATIVE_FS_ERROR_CODE } from '../errors';
import {
  ensurePermission,
  hasPermission,
  queryPermission,
  requestPermission,
} from '../permissions';
import { pickDirectory } from '../picker';
import {
  isFileSystemDirectoryHandle,
  supportsFileSystemObserver,
  supportsNativeFs,
} from '../support';
import { asRootHandle, FakeDirectoryHandle } from './fakes';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('support detection', () => {
  it('detects the directory picker specifically', () => {
    expect(supportsNativeFs()).toBe(false);
    vi.stubGlobal('showDirectoryPicker', () => Promise.resolve());
    expect(supportsNativeFs()).toBe(true);
  });

  it('detects FileSystemObserver', () => {
    expect(supportsFileSystemObserver()).toBe(false);
    vi.stubGlobal('FileSystemObserver', class {});
    expect(supportsFileSystemObserver()).toBe(true);
  });

  it('guards directory handles restored from untyped storage', () => {
    const dir = new FakeDirectoryHandle('w');
    expect(isFileSystemDirectoryHandle(dir)).toBe(true);
    expect(isFileSystemDirectoryHandle(null)).toBe(false);
    expect(isFileSystemDirectoryHandle({})).toBe(false);
    expect(isFileSystemDirectoryHandle({ kind: 'file' })).toBe(false);
  });
});

describe('permissions', () => {
  it('queries per mode', async () => {
    const dir = new FakeDirectoryHandle('w');
    dir.permissions = { read: 'granted', readwrite: 'prompt' };
    expect(await queryPermission(asRootHandle(dir), 'read')).toBe('granted');
    expect(await queryPermission(asRootHandle(dir), 'readwrite')).toBe(
      'prompt',
    );
    expect(await hasPermission(asRootHandle(dir), 'readwrite')).toBe(false);
  });

  it('assumes granted when queryPermission is unavailable (Safari OPFS)', async () => {
    const handle = { name: 'x', kind: 'directory' } as FileSystemHandle;
    expect(await queryPermission(handle, 'readwrite')).toBe('granted');
    await expect(
      ensurePermission(handle, 'readwrite'),
    ).resolves.toBeUndefined();
  });

  it('requests permission and reports the outcome', async () => {
    const dir = new FakeDirectoryHandle('w');
    dir.permissions = { read: 'granted', readwrite: 'prompt' };
    expect(await requestPermission(asRootHandle(dir), 'readwrite')).toBe(true);
    expect(dir.permissions.readwrite).toBe('granted');

    const denied = new FakeDirectoryHandle('w2');
    denied.requestPermissionResult = 'denied';
    expect(await requestPermission(asRootHandle(denied), 'readwrite')).toBe(
      false,
    );
  });

  it('ensurePermission throws a typed error when not granted', async () => {
    const dir = new FakeDirectoryHandle('w');
    dir.permissions = { read: 'prompt', readwrite: 'prompt' };
    const error = await ensurePermission(asRootHandle(dir), 'read').catch(
      (e) => e,
    );
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.permissionDenied)).toBe(
      true,
    );
  });
});

describe('pickDirectory', () => {
  it('throws unsupported when the picker API is missing', async () => {
    const error = await pickDirectory().catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.unsupported)).toBe(true);
  });

  it('passes picker options and resolves with a permitted handle', async () => {
    const dir = new FakeDirectoryHandle('picked');
    const picker = vi.fn(async () => asRootHandle(dir));
    vi.stubGlobal('showDirectoryPicker', picker);

    const handle = await pickDirectory({ id: 'bangle-ws' });
    expect(handle).toBe(asRootHandle(dir));
    expect(picker).toHaveBeenCalledWith({ id: 'bangle-ws', mode: 'readwrite' });
  });

  it('maps user cancellation to userAborted', async () => {
    vi.stubGlobal('showDirectoryPicker', async () => {
      throw new DOMException('The user aborted a request.', 'AbortError');
    });
    const error = await pickDirectory().catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.userAborted)).toBe(true);
  });

  it('maps missing user activation to activationRequired', async () => {
    vi.stubGlobal('showDirectoryPicker', async () => {
      throw new DOMException(
        'Must be handling a user gesture to show a file picker.',
        'SecurityError',
      );
    });
    const error = await pickDirectory().catch((e) => e);
    expect(
      isNativeFsError(error, NATIVE_FS_ERROR_CODE.activationRequired),
    ).toBe(true);
  });

  it('maps a denied permission prompt to permissionDenied', async () => {
    const dir = new FakeDirectoryHandle('picked');
    dir.permissions = { read: 'granted', readwrite: 'prompt' };
    dir.requestPermissionResult = 'denied';
    vi.stubGlobal('showDirectoryPicker', async () => asRootHandle(dir));

    const error = await pickDirectory().catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.permissionDenied)).toBe(
      true,
    );
  });

  it('wraps a rejecting requestPermission in the typed taxonomy', async () => {
    const dir = new FakeDirectoryHandle('my-notes');
    dir.permissions.readwrite = 'prompt';
    dir.requestPermission = async () => {
      throw new DOMException('prompt failed', 'InvalidStateError');
    };
    vi.stubGlobal('showDirectoryPicker', async () => asRootHandle(dir));

    const error = await pickDirectory().catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.permissionDenied)).toBe(
      true,
    );
    expect((error as { cause?: unknown }).cause).toBeInstanceOf(DOMException);
  });
});

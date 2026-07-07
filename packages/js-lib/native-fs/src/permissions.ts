import { NATIVE_FS_ERROR_CODE, NativeFsError } from './errors';
import type { NativeFsPermissionMode, PermissionCapableHandle } from './types';

/**
 * Queries the current permission state without prompting the user.
 *
 * Engines whose handles lack `queryPermission` (e.g. Safari OPFS) are treated
 * as granted: on those engines possession of the handle is the permission.
 */
export async function queryPermission(
  handle: FileSystemHandle,
  mode: NativeFsPermissionMode,
): Promise<PermissionState> {
  const query = (handle as PermissionCapableHandle).queryPermission;
  if (typeof query !== 'function') {
    return 'granted';
  }
  return query.call(handle, { mode });
}

export async function hasPermission(
  handle: FileSystemHandle,
  mode: NativeFsPermissionMode,
): Promise<boolean> {
  return (await queryPermission(handle, mode)) === 'granted';
}

/**
 * Prompts the user for permission. Must be called from a user gesture
 * (a click handler etc.) — browsers reject the request otherwise.
 */
export async function requestPermission(
  handle: FileSystemHandle,
  mode: NativeFsPermissionMode,
): Promise<boolean> {
  const request = (handle as PermissionCapableHandle).requestPermission;
  if (typeof request !== 'function') {
    return true;
  }
  return (await request.call(handle, { mode })) === 'granted';
}

/**
 * Asserts the permission is already granted, without prompting. Services
 * running outside a user gesture use this so a lapsed permission surfaces as
 * a typed error the UI can turn into a re-auth flow.
 */
export async function ensurePermission(
  handle: FileSystemHandle,
  mode: NativeFsPermissionMode,
): Promise<void> {
  if (!(await hasPermission(handle, mode))) {
    throw new NativeFsError({
      message: `Permission (${mode}) is not granted for "${handle.name}"`,
      code: NATIVE_FS_ERROR_CODE.permissionDenied,
    });
  }
}

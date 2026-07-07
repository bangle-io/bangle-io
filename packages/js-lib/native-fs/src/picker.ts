import { isAbortError } from '@bangle.io/mini-js-utils';

import { NATIVE_FS_ERROR_CODE, NativeFsError } from './errors';
import { requestPermission } from './permissions';
import { getShowDirectoryPicker } from './support';
import type { DirectoryPickerOpts } from './types';

/**
 * Shows the browser directory picker and ensures the requested permission
 * mode is granted before resolving.
 *
 * Must be called from a user gesture. Failures are typed:
 * - `userAborted` — the user dismissed the picker
 * - `activationRequired` — called without a (fresh enough) user gesture
 * - `permissionDenied` — the user picked a directory but denied permission
 * - `unsupported` — the environment has no `showDirectoryPicker`
 */
export async function pickDirectory(
  opts: DirectoryPickerOpts = {},
): Promise<FileSystemDirectoryHandle> {
  const showDirectoryPicker = getShowDirectoryPicker();
  if (!showDirectoryPicker) {
    throw new NativeFsError({
      message: 'This browser does not support picking a directory',
      code: NATIVE_FS_ERROR_CODE.unsupported,
    });
  }

  const { mode = 'readwrite', ...rest } = opts;

  let handle: FileSystemDirectoryHandle;
  try {
    handle = await showDirectoryPicker({ mode, ...rest });
  } catch (error) {
    if (isAbortError(error)) {
      throw new NativeFsError({
        message: 'The user dismissed the directory picker',
        code: NATIVE_FS_ERROR_CODE.userAborted,
        cause: error,
      });
    }
    if (
      error instanceof DOMException &&
      (error.name === 'SecurityError' ||
        error.message.toLowerCase().includes('user activation'))
    ) {
      throw new NativeFsError({
        message: 'Opening the directory picker requires a user gesture',
        code: NATIVE_FS_ERROR_CODE.activationRequired,
        cause: error,
      });
    }
    throw new NativeFsError({
      message: 'Unable to open the directory picker',
      code: NATIVE_FS_ERROR_CODE.unknown,
      cause: error,
    });
  }

  // Passing `mode` to the picker already prompts for it in Chrome 105+, in
  // which case this resolves immediately; older implementations that ignored
  // the option get the explicit prompt instead.
  if (!(await requestPermission(handle, mode))) {
    throw new NativeFsError({
      message: `Permission (${mode}) was denied for "${handle.name}"`,
      code: NATIVE_FS_ERROR_CODE.permissionDenied,
    });
  }

  return handle;
}

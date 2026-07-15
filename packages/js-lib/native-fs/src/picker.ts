import { isAbortError } from '@bangle.io/mini-js-utils';

import { isNativeFsError, NATIVE_FS_ERROR_CODE, NativeFsError } from './errors';
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
  const { mode = 'readwrite', ...rest } = opts;

  // `mode` is deliberately NOT forwarded to the picker. A picker-time
  // readwrite grant makes the explicit `requestPermission` below a no-op,
  // and Chrome has not reliably recorded picker-mode grants as persisted
  // grants — losing the "Allow on every visit" restore prompt on the next
  // visit, so users were re-prompted on every return. Picking read-only and
  // then explicitly requesting `mode` keeps the upfront prompt on the
  // requestPermission path, which Chrome persists across sessions.
  const handle = await invokeDirectoryPicker(rest);

  // The explicit permission prompt for `mode`; see the note above on why this
  // must stay the prompting step rather than the picker's `mode` option.
  let granted: boolean;
  try {
    granted = await requestPermission(handle, mode);
  } catch (error) {
    // requestPermission can itself reject (e.g. the user gesture expired by
    // the time the explicit prompt runs); keep the typed taxonomy instead of
    // leaking a raw DOMException to the UI.
    if (isActivationError(error)) {
      throw new NativeFsError({
        message: `Requesting ${mode} permission for "${handle.name}" requires a user gesture`,
        code: NATIVE_FS_ERROR_CODE.activationRequired,
        cause: error,
      });
    }
    throw new NativeFsError({
      message: `Unable to request ${mode} permission for "${handle.name}"`,
      code: NATIVE_FS_ERROR_CODE.permissionDenied,
      cause: error,
    });
  }
  if (!granted) {
    throw new NativeFsError({
      message: `Permission (${mode}) was denied for "${handle.name}"`,
      code: NATIVE_FS_ERROR_CODE.permissionDenied,
    });
  }

  return handle;
}

/**
 * Opens the directory picker anchored at `anchor` purely so the native OS
 * dialog reveals where that folder lives on disk — the web platform never
 * exposes a handle's absolute path, but the OS dialog's own breadcrumb does.
 *
 * This is a best-effort picker workaround, not a guaranteed reveal: the spec
 * treats `startIn` as a suggestion applied "when possible", so a stale or
 * ignored anchor can leave the dialog at an unrelated default location.
 *
 * This function never calls `requestPermission` and discards whatever the
 * dialog resolves with. Note the pick itself is not permission-free: if the
 * user does select a folder, the browser grants (or prompts for) read access
 * to it as part of the pick. Cancelling the dialog is the expected way to
 * close it once the path has been read, so `userAborted` resolves silently.
 *
 * Must be called from a user gesture. Failures are typed:
 * - `unsupported` — the environment has no `showDirectoryPicker`
 * - `activationRequired` — called without a (fresh enough) user gesture
 */
export async function revealDirectoryLocation(
  anchor: FileSystemHandle,
): Promise<void> {
  try {
    // The stable id keeps this reveal from clobbering the default picker
    // bucket that workspace creation uses.
    await invokeDirectoryPicker({
      id: 'bangle-locate-workspace',
      mode: 'read',
      startIn: anchor,
    });
  } catch (error) {
    if (isNativeFsError(error, NATIVE_FS_ERROR_CODE.userAborted)) {
      return;
    }
    throw error;
  }
}

/**
 * Feature-detects and invokes `showDirectoryPicker`, normalizing every
 * rejection into the typed taxonomy. Callers layer their own semantics on
 * top: `pickDirectory` enforces the requested permission on the result,
 * `revealDirectoryLocation` discards it and treats cancellation as success.
 */
async function invokeDirectoryPicker(
  opts: DirectoryPickerOpts,
): Promise<FileSystemDirectoryHandle> {
  const showDirectoryPicker = getShowDirectoryPicker();
  if (!showDirectoryPicker) {
    throw new NativeFsError({
      message: 'This browser does not support picking a directory',
      code: NATIVE_FS_ERROR_CODE.unsupported,
    });
  }

  try {
    return await showDirectoryPicker(opts);
  } catch (error) {
    if (isAbortError(error)) {
      throw new NativeFsError({
        message: 'The user dismissed the directory picker',
        code: NATIVE_FS_ERROR_CODE.userAborted,
        cause: error,
      });
    }
    if (isActivationError(error)) {
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
}

/** A picker/permission call rejected because transient user activation was missing. */
function isActivationError(error: unknown): error is DOMException {
  return (
    error instanceof DOMException &&
    (error.name === 'SecurityError' ||
      error.message.toLowerCase().includes('user activation'))
  );
}

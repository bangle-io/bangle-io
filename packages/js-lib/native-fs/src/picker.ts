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
    // `mode` is deliberately NOT forwarded to the picker. A picker-time
    // readwrite grant makes the explicit `requestPermission` below a no-op,
    // and Chrome has not reliably recorded picker-mode grants as persisted
    // grants — losing the "Allow on every visit" restore prompt on the next
    // visit, so users were re-prompted on every return. Picking read-only and
    // then explicitly requesting `mode` keeps the upfront prompt on the
    // requestPermission path, which Chrome persists across sessions.
    handle = await showDirectoryPicker({ ...rest });
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
 * This is a reveal, not a pick: whatever the user selects is discarded, no
 * permission is requested, and cancelling the dialog is the normal way to
 * close it once the path has been read, so `userAborted` resolves silently.
 *
 * Must be called from a user gesture. Failures are typed:
 * - `unsupported` — the environment has no `showDirectoryPicker`
 * - `activationRequired` — called without a (fresh enough) user gesture
 */
export async function revealDirectoryLocation(
  anchor: FileSystemHandle,
): Promise<void> {
  const showDirectoryPicker = getShowDirectoryPicker();
  if (!showDirectoryPicker) {
    throw new NativeFsError({
      message: 'This browser does not support revealing a directory',
      code: NATIVE_FS_ERROR_CODE.unsupported,
    });
  }

  try {
    // A handle-form `startIn` takes precedence over the picker's per-`id`
    // memory, so the dialog always opens at the anchor; the stable id only
    // keeps this reveal from clobbering the default picker bucket.
    await showDirectoryPicker({
      id: 'bangle-locate-workspace',
      mode: 'read',
      startIn: anchor,
    });
  } catch (error) {
    if (isAbortError(error)) {
      return;
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

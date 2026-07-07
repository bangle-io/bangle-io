import { BaseError, isAbortError } from '@bangle.io/mini-js-utils';

/**
 * Every failure surfaced by this package carries one of these codes so
 * callers can branch on failure kind without string-matching messages or
 * knowing DOMException names.
 */
export const NATIVE_FS_ERROR_CODE = {
  /** The file or directory does not exist. */
  notFound: 'NATIVE_FS_NOT_FOUND',
  /** An exclusive create/move found an existing entry at the destination. */
  alreadyExists: 'NATIVE_FS_ALREADY_EXISTS',
  /** Permission for the requested mode is not currently granted. */
  permissionDenied: 'NATIVE_FS_PERMISSION_DENIED',
  /** The user dismissed/cancelled a browser picker or permission prompt. */
  userAborted: 'NATIVE_FS_USER_ABORTED',
  /** The API call needed a user gesture (transient activation) and had none. */
  activationRequired: 'NATIVE_FS_ACTIVATION_REQUIRED',
  /** The path resolved to a directory where a file was expected (or vice versa). */
  typeMismatch: 'NATIVE_FS_TYPE_MISMATCH',
  /** The browser rejected a write due to storage quota. */
  quotaExceeded: 'NATIVE_FS_QUOTA_EXCEEDED',
  /** The entry cannot be modified right now (e.g. an exclusive writable is open). */
  modificationNotAllowed: 'NATIVE_FS_MODIFICATION_NOT_ALLOWED',
  /**
   * A copy-then-delete move wrote the destination, but reading it back did
   * not match the source byte-for-byte; the source file was kept.
   */
  moveVerificationFailed: 'NATIVE_FS_MOVE_VERIFICATION_FAILED',
  /** The supplied path string is structurally invalid. */
  invalidPath: 'NATIVE_FS_INVALID_PATH',
  /** The current environment does not support the requested API. */
  unsupported: 'NATIVE_FS_UNSUPPORTED',
  /** An upstream failure that does not fit a more specific code. */
  unknown: 'NATIVE_FS_UNKNOWN',
} as const;

export type NativeFsErrorCode =
  (typeof NATIVE_FS_ERROR_CODE)[keyof typeof NATIVE_FS_ERROR_CODE];

export class NativeFsError extends BaseError {
  override code: NativeFsErrorCode;

  constructor(opts: {
    message: string;
    code: NativeFsErrorCode;
    cause?: unknown;
  }) {
    super(opts);
    this.code = opts.code;
  }
}

export function isNativeFsError(
  value: unknown,
  code?: NativeFsErrorCode,
): value is NativeFsError {
  if (!(value instanceof NativeFsError)) {
    return false;
  }
  return code === undefined || value.code === code;
}

/**
 * Normalizes an arbitrary thrown value into a `NativeFsError`, preserving the
 * original as `cause`.
 *
 * Abort errors are intentionally rethrown untouched: a cancelled operation is
 * a benign outcome the caller asked for, not a filesystem failure, and
 * callers detect it with `isAbortError`.
 */
export function toNativeFsError(error: unknown, context: string): unknown {
  if (error instanceof NativeFsError) {
    return error;
  }
  if (isAbortError(error)) {
    return error;
  }

  if (error instanceof DOMException) {
    const code = domExceptionNameToCode(error.name);
    if (code) {
      return new NativeFsError({
        message: `${context}: ${error.message || error.name}`,
        code,
        cause: error,
      });
    }
  }

  return new NativeFsError({
    message: `${context}: ${
      error instanceof Error ? error.message : 'unexpected failure'
    }`,
    code: NATIVE_FS_ERROR_CODE.unknown,
    cause: error,
  });
}

function domExceptionNameToCode(name: string): NativeFsErrorCode | undefined {
  switch (name) {
    case 'NotFoundError': {
      return NATIVE_FS_ERROR_CODE.notFound;
    }
    case 'NotAllowedError':
    case 'SecurityError': {
      return NATIVE_FS_ERROR_CODE.permissionDenied;
    }
    case 'TypeMismatchError': {
      return NATIVE_FS_ERROR_CODE.typeMismatch;
    }
    case 'QuotaExceededError': {
      return NATIVE_FS_ERROR_CODE.quotaExceeded;
    }
    case 'NoModificationAllowedError':
    case 'InvalidModificationError': {
      return NATIVE_FS_ERROR_CODE.modificationNotAllowed;
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Runs `fn` and rewraps any failure through {@link toNativeFsError} so public
 * APIs always fail with a typed error (or an untouched abort error).
 */
export async function guardNativeFsOp<T>(
  context: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toNativeFsError(error, context);
  }
}

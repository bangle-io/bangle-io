import type { RemoteErrorCode } from './protocol';

/**
 * The single error type used across the remote file-storage stack. A store
 * throws it, the router maps it to an HTTP status, and the client re-throws it
 * after mapping a status back to a code. Callers switch on {@link code} rather
 * than parsing messages.
 */
export class RemoteFileError extends Error {
  public readonly code: RemoteErrorCode;
  /** HTTP status when the error originated from a server response. */
  public readonly status?: number;

  constructor(
    code: RemoteErrorCode,
    message?: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(
      message ?? code,
      options?.cause ? { cause: options.cause } : undefined,
    );
    this.name = 'RemoteFileError';
    this.code = code;
    this.status = options?.status;
  }
}

export function isRemoteFileError(value: unknown): value is RemoteFileError {
  return value instanceof RemoteFileError;
}

export function isRemoteFileErrorCode(
  value: unknown,
  code: RemoteErrorCode,
): value is RemoteFileError {
  return isRemoteFileError(value) && value.code === code;
}

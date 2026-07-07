import { RemoteFileError } from './errors';

/**
 * A workspace-scoped filesystem path used on the wire. The first segment is the
 * workspace name; the remaining segments are the path within that workspace.
 *
 * Validation is a data-safety boundary: a malformed or traversing path must
 * never be turned into a read/write outside its workspace. Every store and the
 * router funnel untrusted paths through {@link assertValidFsPath}.
 */

const SEGMENT_DENYLIST = new Set(['', '.', '..']);

export function isValidFsPath(fsPath: string): boolean {
  if (typeof fsPath !== 'string' || fsPath.length === 0) {
    return false;
  }
  // Reject Windows separators, control chars, NUL and absolute paths outright.
  if (fsPath.includes('\\') || fsPath.includes('\0')) {
    return false;
  }
  if (fsPath.startsWith('/')) {
    return false;
  }
  // A file path must not end with a slash (that denotes a directory).
  if (fsPath.endsWith('/')) {
    return false;
  }
  const segments = fsPath.split('/');
  // Need at least a workspace segment plus one path segment.
  if (segments.length < 2) {
    return false;
  }
  for (const segment of segments) {
    if (SEGMENT_DENYLIST.has(segment)) {
      return false;
    }
  }
  return true;
}

export function assertValidFsPath(fsPath: string): void {
  if (!isValidFsPath(fsPath)) {
    throw new RemoteFileError(
      'invalid-path',
      `Invalid remote file path: ${JSON.stringify(fsPath)}`,
    );
  }
}

/** Returns the workspace name (first segment) of an fs path. */
export function wsNameOfFsPath(fsPath: string): string {
  assertValidFsPath(fsPath);
  const first = fsPath.split('/')[0];
  // assertValidFsPath guarantees a non-empty first segment.
  return first as string;
}

/** Validates a workspace name used as a listing key. */
export function isValidWsName(wsName: string): boolean {
  return (
    typeof wsName === 'string' &&
    wsName.length > 0 &&
    !SEGMENT_DENYLIST.has(wsName) &&
    !wsName.includes('/') &&
    !wsName.includes('\\') &&
    !wsName.includes('\0')
  );
}

export function assertValidWsName(wsName: string): void {
  if (!isValidWsName(wsName)) {
    throw new RemoteFileError(
      'invalid-path',
      `Invalid workspace name: ${JSON.stringify(wsName)}`,
    );
  }
}

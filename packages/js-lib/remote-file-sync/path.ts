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

// Windows device names map to hardware, not files — a write "succeeds" and the
// bytes vanish. Reserved regardless of extension (`nul`, `nul.md`, ...). The
// desktop disk store can run on Windows, so this guard is universal.
const RESERVED_WINDOWS_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);

function isSafeSegment(segment: string): boolean {
  if (SEGMENT_DENYLIST.has(segment)) {
    return false;
  }
  // `:` denotes an NTFS alternate data stream — reject it everywhere.
  if (segment.includes(':')) {
    return false;
  }
  const base = (segment.split('.')[0] ?? '').toLowerCase();
  return !RESERVED_WINDOWS_NAMES.has(base);
}

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
  return segments.every(isSafeSegment);
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
    !wsName.includes('/') &&
    !wsName.includes('\\') &&
    !wsName.includes('\0') &&
    isSafeSegment(wsName)
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

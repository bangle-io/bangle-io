/**
 * Wire protocol for the Bangle.io remote file-storage HTTP API.
 *
 * This module is the single source of truth for the paths, headers, verbs and
 * JSON shapes that flow between a Bangle.io client and any server that
 * implements the API. It is intentionally engine-neutral and dependency-free so
 * that both the browser client and a Node/Express/other reference server can
 * import the same contract.
 *
 * The API is deliberately small and RESTful:
 *
 *   GET    {base}/health                    -> HealthResponse
 *   GET    {base}/files?ws=<wsName>         -> ListResponse         (list files)
 *   GET    {base}/file?path=<fsPath>        -> raw bytes            (read)
 *   HEAD   {base}/file?path=<fsPath>        -> 200/404 + stat headers
 *   POST   {base}/file?path=<fsPath>        -> 201 | 409            (create)
 *   PUT    {base}/file?path=<fsPath>        -> 200 | 404            (write existing)
 *   DELETE {base}/file?path=<fsPath>        -> 200 | 404            (delete)
 *   POST   {base}/rename  {from,to}         -> 200 | 404 | 409      (rename/move)
 *   GET    {base}/stat?path=<fsPath>        -> StatResponse         (stat)
 *
 * A `<fsPath>` is a POSIX-style, workspace-scoped path whose first segment is
 * the workspace name, e.g. `myNotes/journal/2024.md`. It never contains `.` or
 * `..` segments and never starts with `/`.
 */

/** Bumped when the wire contract changes in a backwards-incompatible way. */
export const REMOTE_API_VERSION = 1;

/** Default path prefix under which the API is mounted. */
export const REMOTE_API_BASE = '/api/v1';

export const REMOTE_ROUTES = {
  health: '/health',
  files: '/files',
  file: '/file',
  rename: '/rename',
  stat: '/stat',
} as const;

export const REMOTE_HEADERS = {
  authorization: 'authorization',
  /** File modification time (ms since epoch) on read/stat responses. */
  mtime: 'x-bangle-mtime',
  /** File creation time (ms since epoch) on read/stat responses. */
  ctime: 'x-bangle-ctime',
  /** Identifies the calling client; informational only. */
  client: 'x-bangle-client',
  contentType: 'content-type',
} as const;

export const REMOTE_CONTENT_TYPE = {
  json: 'application/json',
  octetStream: 'application/octet-stream',
} as const;

export interface HealthResponse {
  name: string;
  apiVersion: number;
  /** Optional list of workspaces the server hosts (for management UIs). */
  workspaces?: string[];
}

export interface ListResponse {
  /** Workspace-scoped fs paths, e.g. `myNotes/a.md`. */
  paths: string[];
}

export interface StatResponse {
  ctime: number;
  mtime: number;
}

export interface RenameRequestBody {
  from: string;
  to: string;
}

/** JSON error body returned for every non-2xx response. */
export interface ErrorResponseBody {
  error: RemoteErrorCode;
  message?: string;
}

/**
 * Stable, transport-independent error codes. They map 1:1 with HTTP status
 * codes on the wire and with {@link RemoteFileError} in code.
 */
export type RemoteErrorCode =
  | 'not-found'
  | 'already-exists'
  | 'invalid-path'
  | 'unauthorized'
  | 'bad-request'
  | 'network'
  | 'server-error';

/** Maps an error code to the HTTP status a server should respond with. */
export function errorCodeToStatus(code: RemoteErrorCode): number {
  switch (code) {
    case 'not-found':
      return 404;
    case 'already-exists':
      return 409;
    case 'invalid-path':
    case 'bad-request':
      return 400;
    case 'unauthorized':
      return 401;
    case 'network':
    case 'server-error':
      return 500;
    default: {
      const _exhaustive: never = code;
      return 500;
    }
  }
}

/** Maps an HTTP status back to a {@link RemoteErrorCode}. */
export function statusToErrorCode(status: number): RemoteErrorCode {
  switch (status) {
    case 404:
      return 'not-found';
    case 409:
      return 'already-exists';
    case 400:
      return 'bad-request';
    case 401:
    case 403:
      return 'unauthorized';
    default:
      return status >= 500 ? 'server-error' : 'network';
  }
}

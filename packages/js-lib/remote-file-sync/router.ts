import { RemoteFileError } from './errors';
import {
  type ErrorResponseBody,
  errorCodeToStatus,
  type HealthResponse,
  type ListResponse,
  REMOTE_API_VERSION,
  REMOTE_CONTENT_TYPE,
  REMOTE_HEADERS,
  REMOTE_ROUTES,
  type RemoteErrorCode,
  type RenameRequestBody,
  type StatResponse,
} from './protocol';
import type { RemoteFileStore } from './store';

/**
 * A transport-independent request. HTTP/IPC adapters normalise their native
 * request into this shape; `headers` keys are lowercased.
 */
export interface RemoteRequest {
  method: string;
  /** Path relative to the API base, e.g. `/file`, `/files`, `/rename`. */
  path: string;
  query: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  body?: Uint8Array;
}

export interface RemoteResponse {
  status: number;
  headers: Record<string, string>;
  body?: Uint8Array;
}

/** The engine-neutral request handler produced by {@link createRemoteRouter}. */
export type RemoteRouter = (
  req: RemoteRequest,
  signal?: AbortSignal,
) => Promise<RemoteResponse>;

export interface RemoteRouterOptions {
  /**
   * Server name reported by `/health`.
   */
  name?: string;
  /**
   * Bearer token required on every request except `/health`. When omitted the
   * server is open (suitable for localhost / Electron / trusted networks).
   */
  token?: string;
}

const encoder = new TextEncoder();

function jsonBody(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value));
}

function jsonResponse(status: number, value: unknown): RemoteResponse {
  return {
    status,
    headers: { [REMOTE_HEADERS.contentType]: REMOTE_CONTENT_TYPE.json },
    body: jsonBody(value),
  };
}

function errorResponse(
  code: RemoteErrorCode,
  message?: string,
): RemoteResponse {
  const body: ErrorResponseBody = { error: code, message };
  return jsonResponse(errorCodeToStatus(code), body);
}

function statHeaders(stat: StatResponse): Record<string, string> {
  return {
    [REMOTE_HEADERS.mtime]: String(stat.mtime),
    [REMOTE_HEADERS.ctime]: String(stat.ctime),
  };
}

function isAuthorized(req: RemoteRequest, token: string): boolean {
  const header = req.headers[REMOTE_HEADERS.authorization];
  if (!header) {
    return false;
  }
  return safeEqual(header, `Bearer ${token}`);
}

/**
 * Length-independent comparison that does not short-circuit on the first
 * mismatched byte, so response timing does not leak the token. TLS + a strong
 * operator-chosen token remain the primary protection.
 */
function safeEqual(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

/**
 * Builds the engine-neutral request handler for the remote file API. The same
 * router powers the Node reference server and the Electron IPC bridge; only the
 * transport adapter differs.
 */
export function createRemoteRouter(
  store: RemoteFileStore,
  options: RemoteRouterOptions = {},
): (req: RemoteRequest, signal?: AbortSignal) => Promise<RemoteResponse> {
  const serverName = options.name ?? 'bangle-remote-file-server';
  const apiVersion = String(REMOTE_API_VERSION);

  return async function handle(
    req: RemoteRequest,
    signal?: AbortSignal,
  ): Promise<RemoteResponse> {
    const res = await route(store, options, serverName, req, signal);
    // Stamp every response so clients can distinguish a genuine API answer
    // (including a real 404) from an infrastructure response.
    if (!res.headers[REMOTE_HEADERS.api]) {
      res.headers[REMOTE_HEADERS.api] = apiVersion;
    }
    return res;
  };
}

async function route(
  store: RemoteFileStore,
  options: RemoteRouterOptions,
  serverName: string,
  req: RemoteRequest,
  signal?: AbortSignal,
): Promise<RemoteResponse> {
  try {
    const authorized = !options.token || isAuthorized(req, options.token);

    // /health is always reachable so clients can probe connectivity, but it
    // only lists workspace names to authorized callers.
    if (req.path === REMOTE_ROUTES.health && req.method === 'GET') {
      const workspaces = authorized
        ? await store.listWorkspaces?.(signal)
        : undefined;
      const health: HealthResponse = {
        name: serverName,
        apiVersion: REMOTE_API_VERSION,
        ...(workspaces ? { workspaces } : {}),
      };
      return jsonResponse(200, health);
    }

    if (!authorized) {
      return errorResponse('unauthorized', 'Missing or invalid bearer token');
    }

    switch (req.path) {
      case REMOTE_ROUTES.files:
        return await handleFiles(store, req, signal);
      case REMOTE_ROUTES.file:
        return await handleFile(store, req, signal);
      case REMOTE_ROUTES.stat:
        return await handleStat(store, req, signal);
      case REMOTE_ROUTES.rename:
        return await handleRename(store, req, signal);
      default:
        // Not a `not-found` — a 404 from this router always means "file
        // missing", so an unknown route is a client/bad-request error.
        return errorResponse('bad-request', `Unknown route: ${req.path}`);
    }
  } catch (error) {
    if (error instanceof RemoteFileError) {
      return errorResponse(error.code, error.message);
    }
    // Propagate abort as-is so transports can surface cancellation.
    if (isAbort(error, signal)) {
      throw error;
    }
    return errorResponse(
      'server-error',
      error instanceof Error ? error.message : 'Unknown server error',
    );
  }
}

async function handleFiles(
  store: RemoteFileStore,
  req: RemoteRequest,
  signal?: AbortSignal,
): Promise<RemoteResponse> {
  if (req.method !== 'GET') {
    return errorResponse('bad-request', 'Only GET is supported for /files');
  }
  const wsName = req.query.ws;
  if (!wsName) {
    return errorResponse('bad-request', 'Missing ?ws=<workspace>');
  }
  const paths = await store.list(wsName, signal);
  const body: ListResponse = { paths };
  return jsonResponse(200, body);
}

async function handleFile(
  store: RemoteFileStore,
  req: RemoteRequest,
  signal?: AbortSignal,
): Promise<RemoteResponse> {
  const fsPath = req.query.path;
  if (!fsPath) {
    return errorResponse('bad-request', 'Missing ?path=<fsPath>');
  }

  switch (req.method) {
    case 'GET': {
      const result = await store.read(fsPath, signal);
      if (!result) {
        return errorResponse('not-found', `File not found: ${fsPath}`);
      }
      return {
        status: 200,
        headers: {
          [REMOTE_HEADERS.contentType]: REMOTE_CONTENT_TYPE.octetStream,
          ...statHeaders(result.stat),
        },
        body: result.bytes,
      };
    }
    case 'HEAD': {
      const stat = await store.stat(fsPath, signal);
      if (!stat) {
        return { status: 404, headers: {} };
      }
      return { status: 200, headers: statHeaders(stat) };
    }
    case 'POST': {
      await store.create(fsPath, req.body ?? new Uint8Array(), signal);
      return jsonResponse(201, { ok: true });
    }
    case 'PUT': {
      await store.write(fsPath, req.body ?? new Uint8Array(), signal);
      return jsonResponse(200, { ok: true });
    }
    case 'DELETE': {
      await store.delete(fsPath, signal);
      return jsonResponse(200, { ok: true });
    }
    default:
      return errorResponse('bad-request', `Unsupported method: ${req.method}`);
  }
}

async function handleStat(
  store: RemoteFileStore,
  req: RemoteRequest,
  signal?: AbortSignal,
): Promise<RemoteResponse> {
  if (req.method !== 'GET') {
    return errorResponse('bad-request', 'Only GET is supported for /stat');
  }
  const fsPath = req.query.path;
  if (!fsPath) {
    return errorResponse('bad-request', 'Missing ?path=<fsPath>');
  }
  const stat = await store.stat(fsPath, signal);
  if (!stat) {
    return errorResponse('not-found', `File not found: ${fsPath}`);
  }
  const body: StatResponse = stat;
  return jsonResponse(200, body);
}

async function handleRename(
  store: RemoteFileStore,
  req: RemoteRequest,
  signal?: AbortSignal,
): Promise<RemoteResponse> {
  if (req.method !== 'POST') {
    return errorResponse('bad-request', 'Only POST is supported for /rename');
  }
  let parsed: RenameRequestBody;
  try {
    parsed = JSON.parse(new TextDecoder().decode(req.body ?? new Uint8Array()));
  } catch {
    return errorResponse('bad-request', 'Invalid JSON body');
  }
  if (
    !parsed ||
    typeof parsed.from !== 'string' ||
    typeof parsed.to !== 'string'
  ) {
    return errorResponse('bad-request', 'Body must be { from, to }');
  }
  await store.rename(parsed.from, parsed.to, signal);
  return jsonResponse(200, { ok: true });
}

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) {
    return true;
  }
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

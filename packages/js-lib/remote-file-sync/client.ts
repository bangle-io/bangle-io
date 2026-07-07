import { RemoteFileError } from './errors';
import {
  type ErrorResponseBody,
  type HealthResponse,
  type ListResponse,
  REMOTE_API_BASE,
  REMOTE_HEADERS,
  REMOTE_ROUTES,
  type RemoteErrorCode,
  type StatResponse,
  statusToErrorCode,
} from './protocol';
import type { RemoteRouter } from './router';
import type { RemoteFileStat, RemoteReadResult } from './store';

/**
 * The client contract consumed by the Bangle.io file-storage provider. The
 * default implementation talks HTTP; an alternate implementation (e.g. Electron
 * IPC) can satisfy the same interface so the provider stays transport-agnostic.
 *
 * Error contract mirrors the store: `read`/`stat`/`exists` never throw for a
 * missing file; the mutating methods throw {@link RemoteFileError} with a
 * meaningful `code` (`already-exists`, `not-found`, `unauthorized`, `network`).
 */
export interface RemoteFileStorageClient {
  health(signal?: AbortSignal): Promise<HealthResponse>;
  list(wsName: string, signal?: AbortSignal): Promise<string[]>;
  read(
    fsPath: string,
    signal?: AbortSignal,
  ): Promise<RemoteReadResult | undefined>;
  stat(
    fsPath: string,
    signal?: AbortSignal,
  ): Promise<RemoteFileStat | undefined>;
  exists(fsPath: string, signal?: AbortSignal): Promise<boolean>;
  create(
    fsPath: string,
    bytes: Uint8Array,
    signal?: AbortSignal,
  ): Promise<void>;
  write(fsPath: string, bytes: Uint8Array, signal?: AbortSignal): Promise<void>;
  delete(fsPath: string, signal?: AbortSignal): Promise<void>;
  rename(from: string, to: string, signal?: AbortSignal): Promise<void>;
}

/** Minimal subset of `fetch` the client needs; real `fetch` satisfies it. */
export type RemoteFetchResponse = {
  status: number;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
};

export type RemoteFetch = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: Uint8Array;
    signal?: AbortSignal;
  },
) => Promise<RemoteFetchResponse>;

export interface HttpRemoteClientConfig {
  /**
   * Origin the server is reachable at, e.g. `https://notes.example.com`. An
   * empty string means same-origin (bundled mode), producing relative URLs.
   */
  baseUrl: string;
  /** Bearer token sent as `Authorization: Bearer <token>`. */
  token?: string;
  /** Injected transport; defaults to the global `fetch`. */
  fetch?: RemoteFetch;
  /** Value sent as the informational `x-bangle-client` header. */
  clientName?: string;
}

const defaultFetch: RemoteFetch = (url, init) =>
  // Cast: the structural subset above is satisfied by the DOM `fetch`.
  (globalThis.fetch as unknown as RemoteFetch)(url, init);

export function createHttpRemoteClient(
  config: HttpRemoteClientConfig,
): RemoteFileStorageClient {
  const base = config.baseUrl.replace(/\/$/, '') + REMOTE_API_BASE;
  const doFetch = config.fetch ?? defaultFetch;

  function url(route: string, query?: Record<string, string>): string {
    const qs = query
      ? '?' +
        Object.entries(query)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&')
      : '';
    return `${base}${route}${qs}`;
  }

  function headers(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = {
      [REMOTE_HEADERS.client]: config.clientName ?? 'bangle.io',
      ...extra,
    };
    if (config.token) {
      h[REMOTE_HEADERS.authorization] = `Bearer ${config.token}`;
    }
    return h;
  }

  async function toError(res: RemoteFetchResponse): Promise<RemoteFileError> {
    let code: RemoteErrorCode = statusToErrorCode(res.status);
    let message: string | undefined;
    try {
      const text = await res.text();
      if (text) {
        const parsed = JSON.parse(text) as ErrorResponseBody;
        if (parsed?.error) {
          code = parsed.error;
        }
        message = parsed?.message;
      }
    } catch {
      // Non-JSON error body; keep the status-derived code.
    }
    return new RemoteFileError(
      code,
      message ?? `Request failed (${res.status})`,
      {
        status: res.status,
      },
    );
  }

  async function request(
    route: string,
    init: {
      method: string;
      query?: Record<string, string>;
      body?: Uint8Array;
      headers?: Record<string, string>;
      signal?: AbortSignal;
    },
  ): Promise<RemoteFetchResponse> {
    try {
      return await doFetch(url(route, init.query), {
        method: init.method,
        headers: headers(init.headers),
        body: init.body,
        signal: init.signal,
      });
    } catch (error) {
      if (init.signal?.aborted) {
        throw error;
      }
      throw new RemoteFileError(
        'network',
        error instanceof Error ? error.message : 'Network request failed',
        { cause: error },
      );
    }
  }

  function readStat(res: RemoteFetchResponse): RemoteFileStat {
    const mtime = Number(res.headers.get(REMOTE_HEADERS.mtime));
    const ctime = Number(res.headers.get(REMOTE_HEADERS.ctime));
    return {
      mtime: Number.isFinite(mtime) ? mtime : 0,
      ctime: Number.isFinite(ctime) ? ctime : 0,
    };
  }

  return {
    async health(signal) {
      const res = await request(REMOTE_ROUTES.health, {
        method: 'GET',
        signal,
      });
      if (res.status !== 200) {
        throw await toError(res);
      }
      return JSON.parse(await res.text()) as HealthResponse;
    },

    async list(wsName, signal) {
      const res = await request(REMOTE_ROUTES.files, {
        method: 'GET',
        query: { ws: wsName },
        signal,
      });
      if (res.status !== 200) {
        throw await toError(res);
      }
      const body = JSON.parse(await res.text()) as ListResponse;
      return body.paths;
    },

    async read(fsPath, signal) {
      const res = await request(REMOTE_ROUTES.file, {
        method: 'GET',
        query: { path: fsPath },
        signal,
      });
      if (res.status === 404) {
        return undefined;
      }
      if (res.status !== 200) {
        throw await toError(res);
      }
      return {
        bytes: new Uint8Array(await res.arrayBuffer()),
        stat: readStat(res),
      };
    },

    async stat(fsPath, signal) {
      const res = await request(REMOTE_ROUTES.stat, {
        method: 'GET',
        query: { path: fsPath },
        signal,
      });
      if (res.status === 404) {
        return undefined;
      }
      if (res.status !== 200) {
        throw await toError(res);
      }
      return JSON.parse(await res.text()) as StatResponse;
    },

    async exists(fsPath, signal) {
      const res = await request(REMOTE_ROUTES.file, {
        method: 'HEAD',
        query: { path: fsPath },
        signal,
      });
      if (res.status === 200) {
        return true;
      }
      if (res.status === 404) {
        return false;
      }
      throw await toError(res);
    },

    async create(fsPath, bytes, signal) {
      const res = await request(REMOTE_ROUTES.file, {
        method: 'POST',
        query: { path: fsPath },
        body: bytes,
        signal,
      });
      if (res.status !== 201 && res.status !== 200) {
        throw await toError(res);
      }
    },

    async write(fsPath, bytes, signal) {
      const res = await request(REMOTE_ROUTES.file, {
        method: 'PUT',
        query: { path: fsPath },
        body: bytes,
        signal,
      });
      if (res.status !== 200) {
        throw await toError(res);
      }
    },

    async delete(fsPath, signal) {
      const res = await request(REMOTE_ROUTES.file, {
        method: 'DELETE',
        query: { path: fsPath },
        signal,
      });
      if (res.status !== 200) {
        throw await toError(res);
      }
    },

    async rename(from, to, signal) {
      const res = await request(REMOTE_ROUTES.rename, {
        method: 'POST',
        body: new TextEncoder().encode(JSON.stringify({ from, to })),
        headers: { [REMOTE_HEADERS.contentType]: 'application/json' },
        signal,
      });
      if (res.status !== 200) {
        throw await toError(res);
      }
    },
  };
}

/**
 * Builds a {@link RemoteFileStorageClient} that talks directly to a router
 * instead of an HTTP server. The router may be in-process (tests) or a bridge
 * to another process — e.g. Electron's `ipcRenderer.invoke` forwarding requests
 * to a main-process router. This is how the desktop app reuses the exact same
 * provider without a listening socket.
 */
export function createRemoteClientFromRouter(
  router: RemoteRouter,
  config: { token?: string; clientName?: string } = {},
): RemoteFileStorageClient {
  return createHttpRemoteClient({
    baseUrl: '',
    token: config.token,
    clientName: config.clientName,
    fetch: createFetchFromRouter(router),
  });
}

/**
 * Adapts a {@link RemoteRouter} into a {@link RemoteFetch}. This lets the HTTP
 * client run against an in-process router with no sockets — used by the
 * contract tests and by the Electron IPC bridge (main-process router).
 */
export function createFetchFromRouter(router: RemoteRouter): RemoteFetch {
  return async function routerFetch(url, init) {
    const idx = url.indexOf(REMOTE_API_BASE);
    const rest = idx >= 0 ? url.slice(idx + REMOTE_API_BASE.length) : url;
    const [path, qs] = rest.split('?');
    const query: Record<string, string> = {};
    if (qs) {
      for (const [k, v] of new URLSearchParams(qs)) {
        query[k] = v;
      }
    }
    const lowerHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(init.headers)) {
      lowerHeaders[k.toLowerCase()] = v;
    }
    const res = await router(
      {
        method: init.method,
        path: path ?? '',
        query,
        headers: lowerHeaders,
        body: init.body,
      },
      init.signal,
    );
    const body = res.body ?? new Uint8Array();
    return {
      status: res.status,
      headers: {
        get(name: string): string | null {
          return res.headers[name.toLowerCase()] ?? null;
        },
      },
      async arrayBuffer() {
        return body.buffer.slice(
          body.byteOffset,
          body.byteOffset + body.byteLength,
        ) as ArrayBuffer;
      },
      async text() {
        return new TextDecoder().decode(body);
      },
    };
  };
}

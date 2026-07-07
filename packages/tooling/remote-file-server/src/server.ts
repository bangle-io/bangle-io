import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import {
  createRemoteRouter,
  REMOTE_API_BASE,
  REMOTE_API_VERSION,
  REMOTE_HEADERS,
  type RemoteFileStore,
  type RemoteRequest,
} from '@bangle.io/remote-file-sync';
import { serveStatic } from './static-files';

/** Upper bound on a request body. Above the client's 50MB file cap. */
const DEFAULT_MAX_BODY_BYTES = 64 * 1024 * 1024;

class PayloadTooLargeError extends Error {}

export interface RemoteFileServerOptions {
  store: RemoteFileStore;
  /** Bearer token required on API calls (except `/health`). */
  token?: string;
  /** Name reported by `/health`. */
  name?: string;
  /**
   * Directory of a built Bangle.io front-end to serve at the same origin as the
   * API. When set, the server doubles as the app host ("bundled" mode).
   */
  staticDir?: string;
  /**
   * HTML injected before `</head>` of served pages. Used in bundled mode to
   * hint the front-end that it can default a remote workspace to this origin.
   */
  htmlInject?: string;
  /** Max request body in bytes (default 64 MiB); larger requests get `413`. */
  maxBodyBytes?: number;
  logger?: Pick<Console, 'log' | 'error'>;
}

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,HEAD,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': `${REMOTE_HEADERS.authorization},${REMOTE_HEADERS.contentType},${REMOTE_HEADERS.client}`,
  'access-control-expose-headers': `${REMOTE_HEADERS.mtime},${REMOTE_HEADERS.ctime}`,
  'access-control-max-age': '86400',
};

/**
 * Creates (but does not start) an HTTP server exposing the remote file API and,
 * optionally, a bundled front-end. Use {@link startRemoteFileServer} to listen.
 */
export function createRemoteFileServer(
  options: RemoteFileServerOptions,
): Server {
  const router = createRemoteRouter(options.store, {
    token: options.token,
    name: options.name,
  });
  const logger = options.logger ?? console;

  return createServer((req, res) => {
    handle(req, res, router, options).catch((error) => {
      logger.error?.('[remote-file-server] request failed', error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
      }
      res.end(JSON.stringify({ error: 'server-error' }));
    });
  });
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  router: ReturnType<typeof createRemoteRouter>,
  options: RemoteFileServerOptions,
): Promise<void> {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', 'http://localhost');

  // Cross-origin access (e.g. app.bangle.io → your server) is only allowed when
  // a token is configured. Without CORS headers the browser blocks cross-origin
  // reads, so a tokenless server can't be pillaged by a random website the user
  // visits; same-origin (bundled/Docker) mode needs no CORS and is unaffected.
  if (options.token) {
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      res.setHeader(key, value);
    }
  }
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (url.pathname.startsWith(REMOTE_API_BASE)) {
    await handleApi(req, res, router, method, url, options);
    return;
  }

  if (options.staticDir) {
    const served = await serveStatic(options.staticDir, url.pathname, res, {
      injectHead: options.htmlInject,
    });
    if (served) {
      return;
    }
  }

  res.statusCode = 404;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ error: 'not-found' }));
}

async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  router: ReturnType<typeof createRemoteRouter>,
  method: string,
  url: URL,
  options: RemoteFileServerOptions,
): Promise<void> {
  const maxBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  let body: Uint8Array | undefined;
  if (method === 'POST' || method === 'PUT') {
    try {
      body = await readBody(req, maxBytes);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        res.statusCode = 413;
        // Close the connection: we stopped reading the body, so the socket
        // can't be safely reused. The response still flushes to the client.
        res.setHeader('connection', 'close');
        res.setHeader(REMOTE_HEADERS.api, String(REMOTE_API_VERSION));
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            error: 'bad-request',
            message: 'Payload too large',
          }),
        );
        return;
      }
      throw error;
    }
  }

  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    query[key] = value;
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      headers[key.toLowerCase()] = value.join(',');
    }
  }

  const request: RemoteRequest = {
    method,
    path: url.pathname.slice(REMOTE_API_BASE.length) || '/',
    query,
    headers,
    body,
  };

  const response = await router(request);
  res.statusCode = response.status;
  for (const [key, value] of Object.entries(response.headers)) {
    res.setHeader(key, value);
  }
  if (response.body && method !== 'HEAD') {
    res.end(Buffer.from(response.body));
  } else {
    res.end();
  }
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
      // Pause (don't destroy) so the caller can still flush a 413 response.
      req.pause();
      reject(new PayloadTooLargeError());
      return;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.pause();
        reject(new PayloadTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
    req.on('error', reject);
  });
}

export interface StartedRemoteFileServer {
  server: Server;
  port: number;
  host: string;
  url: string;
  close: () => Promise<void>;
}

/** Starts the server and resolves once it is listening. */
export function startRemoteFileServer(
  options: RemoteFileServerOptions & { port: number; host?: string },
): Promise<StartedRemoteFileServer> {
  const server = createRemoteFileServer(options);
  const host = options.host ?? '0.0.0.0';
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, host, () => {
      const address = server.address();
      const port =
        typeof address === 'object' && address ? address.port : options.port;
      const displayHost = host === '0.0.0.0' ? 'localhost' : host;
      resolve({
        server,
        port,
        host,
        url: `http://${displayHost}:${port}`,
        close: () =>
          new Promise<void>((res, rej) =>
            server.close((err) => (err ? rej(err) : res())),
          ),
      });
    });
  });
}

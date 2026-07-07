import path from 'node:path';
import process from 'node:process';

export interface ServerConfig {
  port: number;
  host: string;
  root: string;
  token?: string;
  staticDir?: string;
  name: string;
}

/** Reads server configuration from environment variables. */
export function readConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  const port = Number(env.BANGLE_FILE_SERVER_PORT ?? env.PORT ?? '8000');
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(
      `Invalid BANGLE_FILE_SERVER_PORT: ${env.BANGLE_FILE_SERVER_PORT}`,
    );
  }
  const root = path.resolve(env.BANGLE_FILE_SERVER_ROOT ?? './data');
  const staticDir = env.BANGLE_FILE_SERVER_STATIC_DIR
    ? path.resolve(env.BANGLE_FILE_SERVER_STATIC_DIR)
    : undefined;

  const token = env.BANGLE_FILE_SERVER_TOKEN || undefined;
  // Without a token, bind loopback by default so the store is not exposed to
  // the local network; a tokened server defaults to all interfaces. Either can
  // be overridden explicitly (the Docker image sets 0.0.0.0).
  const host = env.BANGLE_FILE_SERVER_HOST ?? (token ? '0.0.0.0' : '127.0.0.1');

  return {
    port,
    host,
    root,
    token,
    staticDir,
    name: env.BANGLE_FILE_SERVER_NAME ?? 'bangle-remote-file-server',
  };
}

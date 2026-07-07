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

  return {
    port,
    host: env.BANGLE_FILE_SERVER_HOST ?? '0.0.0.0',
    root,
    token: env.BANGLE_FILE_SERVER_TOKEN || undefined,
    staticDir,
    name: env.BANGLE_FILE_SERVER_NAME ?? 'bangle-remote-file-server',
  };
}

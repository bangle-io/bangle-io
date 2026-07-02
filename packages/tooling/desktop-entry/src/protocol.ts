import { extname, resolve, sep } from 'node:path';

export const APP_PROTOCOL = 'bangle';
export const APP_HOST = 'app';
export const APP_ORIGIN = `${APP_PROTOCOL}://${APP_HOST}`;
export const APP_URL = `${APP_ORIGIN}/`;

const CONTENT_TYPES = new Map<string, string>([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
]);

export class DesktopProtocolPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DesktopProtocolPathError';
  }
}

export function getContentType(filePath: string): string {
  return CONTENT_TYPES.get(extname(filePath)) ?? 'application/octet-stream';
}

export function shouldServeIndexFallback(requestUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return false;
  }

  if (url.protocol !== `${APP_PROTOCOL}:` || url.hostname !== APP_HOST) {
    return false;
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    return false;
  }

  return extname(decodedPath) === '';
}

export function resolveProtocolFilePath(input: {
  readonly rootDir: string;
  readonly requestUrl: string;
}): string {
  const rootDir = resolve(input.rootDir);
  let url: URL;

  if (/(^|[\\/])(?:\.|%2e)(?:\.|%2e)(?:[\\/]|$)/i.test(input.requestUrl)) {
    throw new DesktopProtocolPathError(
      `Desktop app path contains a traversal segment: ${input.requestUrl}`,
    );
  }

  try {
    url = new URL(input.requestUrl);
  } catch (error) {
    throw new DesktopProtocolPathError(
      `Invalid desktop app protocol URL: ${String(error)}`,
    );
  }

  if (url.protocol !== `${APP_PROTOCOL}:` || url.hostname !== APP_HOST) {
    throw new DesktopProtocolPathError(
      `Unsupported desktop app protocol URL: ${input.requestUrl}`,
    );
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch (error) {
    throw new DesktopProtocolPathError(
      `Invalid encoded desktop app path: ${String(error)}`,
    );
  }

  if (decodedPath.includes('\0')) {
    throw new DesktopProtocolPathError('Desktop app path contains a null byte');
  }

  const relativePath = decodedPath.replace(/^\/+/, '') || 'index.html';
  const filePath = resolve(rootDir, relativePath);
  const isInsideRoot =
    filePath === rootDir || filePath.startsWith(`${rootDir}${sep}`);

  if (!isInsideRoot) {
    throw new DesktopProtocolPathError(
      `Desktop app path escapes the browser asset directory: ${decodedPath}`,
    );
  }

  return filePath;
}

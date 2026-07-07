import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import path from 'node:path';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

function contentTypeFor(filePath: string): string {
  return (
    CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
    'application/octet-stream'
  );
}

/**
 * Serves a single-page app from `rootDir`. Real files are streamed as-is;
 * unknown routes fall back to `index.html` so client-side routing works. Path
 * traversal is prevented by resolving within `rootDir`.
 *
 * Returns `true` when it handled the request, `false` when the app shell is
 * missing (so the caller can 404).
 */
export async function serveStatic(
  rootDir: string,
  pathname: string,
  res: ServerResponse,
  options: { injectHead?: string } = {},
): Promise<boolean> {
  const root = path.resolve(rootDir);
  const decoded = decodeURIComponent(pathname);
  const requested = path.resolve(root, `.${decoded}`);

  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  const safe = requested === root || requested.startsWith(rootWithSep);

  let target = safe ? requested : root;
  let stat = await statOrNull(target);
  if (stat?.isDirectory()) {
    target = path.join(target, 'index.html');
    stat = await statOrNull(target);
  }

  if (!stat?.isFile()) {
    // SPA fallback to the app shell.
    target = path.join(root, 'index.html');
    stat = await statOrNull(target);
    if (!stat?.isFile()) {
      return false;
    }
  }

  // Inject a marker into HTML so the front-end knows it is being served by a
  // Bangle file server (bundled mode) and can default the workspace to this
  // same origin.
  const isHtml = target.toLowerCase().endsWith('.html');
  if (isHtml && options.injectHead) {
    const html = await fs.readFile(target, 'utf8');
    const injected = html.includes('</head>')
      ? html.replace('</head>', `${options.injectHead}</head>`)
      : options.injectHead + html;
    const body = Buffer.from(injected, 'utf8');
    res.statusCode = 200;
    res.setHeader('content-type', contentTypeFor(target));
    res.setHeader('content-length', String(body.byteLength));
    res.end(body);
    return true;
  }

  res.statusCode = 200;
  res.setHeader('content-type', contentTypeFor(target));
  res.setHeader('content-length', String(stat.size));
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(target);
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });
  return true;
}

async function statOrNull(p: string) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

import { createServer } from 'node:http';
import {
  createReadStream,
  existsSync,
  promises as fsPromises,
  statSync,
} from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const PORT = Number(process.env.PORT || '8080');
const SERVER_FS_ROOT = path.resolve(process.env.SERVER_FS_ROOT || '/mnt');
const DIST_DIR = path.resolve(process.env.STATIC_DIR || '/opt/bangle/dist');
const API_BASE = '/api/server-fs';
const WORKSPACE_MAP_FILE = path.join(SERVER_FS_ROOT, '.bangle-workspaces.json');

let workspacePathMap = {};

function sendJson(res, status, value) {
  const body = JSON.stringify({ ok: status < 400, value });
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
  });
  res.end(text);
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    case '.map':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function parseWsPath(wsPath) {
  const separatorIndex = wsPath.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex >= wsPath.length - 1) {
    throw new Error('Invalid wsPath');
  }

  const wsName = wsPath.slice(0, separatorIndex);
  const relativePath = wsPath.slice(separatorIndex + 1);

  if (!wsName || !relativePath || relativePath.includes('\0')) {
    throw new Error('Invalid wsPath');
  }
  if (path.isAbsolute(relativePath)) {
    throw new Error('Absolute path is not allowed');
  }

  const normalized = path.posix.normalize(relativePath);
  if (
    normalized === '' ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../')
  ) {
    throw new Error('Directory traversal is not allowed');
  }

  const configuredRoot = workspacePathMap[wsName] || wsName;
  const workspaceRoot = resolveWorkspaceRoot(configuredRoot);
  const absolutePath = path.resolve(workspaceRoot, normalized);
  if (
    absolutePath !== workspaceRoot &&
    !absolutePath.startsWith(`${workspaceRoot}${path.sep}`)
  ) {
    throw new Error('Directory traversal is not allowed');
  }

  return {
    wsName,
    normalizedRelativePath: normalized,
    workspaceRoot,
    absolutePath,
  };
}

function resolveWorkspaceRoot(inputPath) {
  const trimmed = String(inputPath || '').trim();
  if (!trimmed) {
    throw new Error('Invalid workspace root');
  }

  if (path.isAbsolute(trimmed)) {
    const absoluteRoot = path.resolve(trimmed);
    if (
      absoluteRoot !== SERVER_FS_ROOT &&
      !absoluteRoot.startsWith(`${SERVER_FS_ROOT}${path.sep}`)
    ) {
      throw new Error('Invalid workspace root');
    }
    return absoluteRoot;
  }

  const normalizedRelativeRoot = path.posix.normalize(trimmed);
  if (
    normalizedRelativeRoot === '' ||
    normalizedRelativeRoot === '.' ||
    normalizedRelativeRoot === '..' ||
    normalizedRelativeRoot.startsWith('../')
  ) {
    throw new Error('Invalid workspace root');
  }
  const absoluteRoot = path.resolve(SERVER_FS_ROOT, normalizedRelativeRoot);
  if (
    absoluteRoot !== SERVER_FS_ROOT &&
    !absoluteRoot.startsWith(`${SERVER_FS_ROOT}${path.sep}`)
  ) {
    throw new Error('Invalid workspace root');
  }
  return absoluteRoot;
}

async function loadWorkspaceMap() {
  try {
    const raw = await fsPromises.readFile(WORKSPACE_MAP_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      workspacePathMap = parsed;
    }
  } catch {
    workspacePathMap = {};
  }
}

async function saveWorkspaceMap() {
  await fsPromises.mkdir(SERVER_FS_ROOT, { recursive: true });
  await fsPromises.writeFile(
    WORKSPACE_MAP_FILE,
    JSON.stringify(workspacePathMap, null, 2),
    'utf8',
  );
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function walkFiles(dirPath, acc = []) {
  const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, acc);
      continue;
    }
    acc.push(fullPath);
  }
  return acc;
}

async function handleApi(req, res, url) {
  if (url.pathname === `${API_BASE}/health`) {
    sendJson(res, 200, true);
    return;
  }

  if (url.pathname === `${API_BASE}/workspaces` && req.method === 'POST') {
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8'));
      const wsName = typeof body?.wsName === 'string' ? body.wsName.trim() : '';
      const serverPath =
        typeof body?.serverPath === 'string' ? body.serverPath.trim() : '';
      if (!wsName || !serverPath) {
        sendText(res, 400, 'Missing wsName/serverPath');
        return;
      }

      const normalizedServerPath = path.posix.normalize(serverPath);
      if (!normalizedServerPath) {
        sendText(res, 400, 'Invalid serverPath');
        return;
      }

      const rootPath = resolveWorkspaceRoot(serverPath);

      workspacePathMap[wsName] = normalizedServerPath;
      await saveWorkspaceMap();
      await fsPromises.mkdir(rootPath, { recursive: true });
      sendJson(res, 200, true);
    } catch (error) {
      sendText(res, 400, error instanceof Error ? error.message : 'Bad request');
    }
    return;
  }

  if (url.pathname === `${API_BASE}/list` && req.method === 'GET') {
    const wsName = url.searchParams.get('wsName');
    if (!wsName) {
      sendText(res, 400, 'Missing wsName');
      return;
    }

    let workspaceRoot;
    try {
      workspaceRoot = resolveWorkspaceRoot(workspacePathMap[wsName] || wsName);
    } catch (error) {
      sendText(res, 400, error instanceof Error ? error.message : 'Bad request');
      return;
    }
    if (!existsSync(workspaceRoot)) {
      sendJson(res, 200, []);
      return;
    }

    const files = await walkFiles(workspaceRoot);
    const wsPaths = files
      .map((filePath) => {
        const rel = path.relative(workspaceRoot, filePath).split(path.sep).join('/');
        return `${wsName}:${rel}`;
      })
      .sort((a, b) => a.localeCompare(b));

    sendJson(res, 200, wsPaths);
    return;
  }

  if (url.pathname === `${API_BASE}/exists` && req.method === 'GET') {
    const wsPath = url.searchParams.get('wsPath');
    if (!wsPath) {
      sendText(res, 400, 'Missing wsPath');
      return;
    }
    try {
      const { absolutePath } = parseWsPath(wsPath);
      sendJson(res, 200, existsSync(absolutePath));
    } catch (error) {
      sendText(res, 400, error instanceof Error ? error.message : 'Bad request');
    }
    return;
  }

  if (url.pathname === `${API_BASE}/stat` && req.method === 'GET') {
    const wsPath = url.searchParams.get('wsPath');
    if (!wsPath) {
      sendText(res, 400, 'Missing wsPath');
      return;
    }
    try {
      const { absolutePath } = parseWsPath(wsPath);
      const stat = await fsPromises.stat(absolutePath);
      sendJson(res, 200, {
        ctime: stat.ctimeMs,
        mtime: stat.mtimeMs,
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        sendText(res, 404, 'File not found');
        return;
      }
      sendText(res, 400, error instanceof Error ? error.message : 'Bad request');
    }
    return;
  }

  if (url.pathname === `${API_BASE}/file` && req.method === 'GET') {
    const wsPath = url.searchParams.get('wsPath');
    if (!wsPath) {
      sendText(res, 400, 'Missing wsPath');
      return;
    }
    try {
      const { absolutePath } = parseWsPath(wsPath);
      const stat = await fsPromises.stat(absolutePath);
      const fileName = path.basename(absolutePath);
      res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'x-file-name': fileName,
        'x-last-modified': String(Math.floor(stat.mtimeMs)),
      });
      await pipeline(createReadStream(absolutePath), res);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        sendText(res, 404, 'File not found');
        return;
      }
      sendText(res, 400, error instanceof Error ? error.message : 'Bad request');
    }
    return;
  }

  if (url.pathname === `${API_BASE}/file` && req.method === 'PUT') {
    const wsPath = url.searchParams.get('wsPath');
    const mode = url.searchParams.get('mode') || 'create';
    if (!wsPath) {
      sendText(res, 400, 'Missing wsPath');
      return;
    }
    if (mode !== 'create' && mode !== 'update') {
      sendText(res, 400, 'Invalid mode');
      return;
    }
    try {
      const { absolutePath } = parseWsPath(wsPath);
      const exists = existsSync(absolutePath);
      if (mode === 'create' && exists) {
        sendText(res, 409, 'File already exists');
        return;
      }
      if (mode === 'update' && !exists) {
        sendText(res, 404, 'File not found');
        return;
      }

      const body = await readBody(req);
      await fsPromises.mkdir(path.dirname(absolutePath), { recursive: true });
      await fsPromises.writeFile(absolutePath, body);
      sendJson(res, 200, true);
    } catch (error) {
      sendText(res, 400, error instanceof Error ? error.message : 'Bad request');
    }
    return;
  }

  if (url.pathname === `${API_BASE}/file` && req.method === 'DELETE') {
    const wsPath = url.searchParams.get('wsPath');
    if (!wsPath) {
      sendText(res, 400, 'Missing wsPath');
      return;
    }
    try {
      const { absolutePath } = parseWsPath(wsPath);
      await fsPromises.unlink(absolutePath);
      sendJson(res, 200, true);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        sendText(res, 404, 'File not found');
        return;
      }
      sendText(res, 400, error instanceof Error ? error.message : 'Bad request');
    }
    return;
  }

  if (url.pathname === `${API_BASE}/rename` && req.method === 'POST') {
    try {
      const body = JSON.parse((await readBody(req)).toString('utf8'));
      const wsPath = body?.wsPath;
      const newWsPath = body?.newWsPath;
      if (typeof wsPath !== 'string' || typeof newWsPath !== 'string') {
        sendText(res, 400, 'Missing wsPath/newWsPath');
        return;
      }

      const oldPath = parseWsPath(wsPath);
      const newPath = parseWsPath(newWsPath);
      await fsPromises.mkdir(path.dirname(newPath.absolutePath), {
        recursive: true,
      });
      await fsPromises.rename(oldPath.absolutePath, newPath.absolutePath);
      sendJson(res, 200, true);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        sendText(res, 404, 'File not found');
        return;
      }
      sendText(res, 400, error instanceof Error ? error.message : 'Bad request');
    }
    return;
  }

  sendText(res, 404, 'Not found');
}

async function serveStatic(req, res, url) {
  const requestPath = decodeURIComponent(url.pathname);
  let targetPath =
    requestPath === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, requestPath);

  const normalizedDistPath = path.resolve(DIST_DIR);
  const normalizedTargetPath = path.resolve(targetPath);
  if (
    normalizedTargetPath !== normalizedDistPath &&
    !normalizedTargetPath.startsWith(`${normalizedDistPath}${path.sep}`)
  ) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  if (!existsSync(normalizedTargetPath) || statSync(normalizedTargetPath).isDirectory()) {
    targetPath = path.join(DIST_DIR, 'index.html');
  } else {
    targetPath = normalizedTargetPath;
  }

  try {
    const stat = await fsPromises.stat(targetPath);
    res.writeHead(200, {
      'content-type': getContentType(targetPath),
      'content-length': stat.size,
    });
    await pipeline(createReadStream(targetPath), res);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    sendText(res, 400, 'Bad request');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    sendText(res, 200, 'ok\n');
    return;
  }

  if (url.pathname.startsWith(API_BASE)) {
    await handleApi(req, res, url);
    return;
  }

  await serveStatic(req, res, url);
});

await fsPromises.mkdir(SERVER_FS_ROOT, { recursive: true });
await loadWorkspaceMap();

server.listen(PORT, () => {
  console.log(
    `bangle server listening on :${PORT} (static=${DIST_DIR}, server-fs=${SERVER_FS_ROOT})`,
  );
});

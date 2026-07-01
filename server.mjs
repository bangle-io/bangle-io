import { createServer } from 'node:http';
import {
  constants as fsConstants,
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

function normalizeWorkspaceMapPath(inputPath) {
  const trimmed = String(inputPath || '').trim();
  const absoluteRoot = resolveWorkspaceRoot(trimmed);
  return path.isAbsolute(trimmed) ? absoluteRoot : path.posix.normalize(trimmed);
}

async function loadWorkspaceMap() {
  let raw;
  try {
    raw = await fsPromises.readFile(WORKSPACE_MAP_FILE, 'utf8');
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) {
      workspacePathMap = {};
      return;
    }
    throw error;
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Invalid workspace map file: ${WORKSPACE_MAP_FILE}`);
  }

  const loadedMap = {};
  for (const [wsName, serverPath] of Object.entries(parsed)) {
    if (typeof serverPath !== 'string') {
      throw new Error(`Invalid workspace map entry for ${wsName}`);
    }
    loadedMap[wsName] = normalizeWorkspaceMapPath(serverPath);
  }
  workspacePathMap = loadedMap;
}

async function saveWorkspaceMap(nextWorkspacePathMap) {
  await fsPromises.mkdir(SERVER_FS_ROOT, { recursive: true });
  const tempPath = path.join(
    SERVER_FS_ROOT,
    `.bangle-workspaces.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}.json.tmp`,
  );
  try {
    await fsPromises.writeFile(
      tempPath,
      JSON.stringify(nextWorkspacePathMap, null, 2),
      {
        encoding: 'utf8',
        flag: 'wx',
      },
    );
    await fsPromises.rename(tempPath, WORKSPACE_MAP_FILE);
  } catch (error) {
    await fsPromises.unlink(tempPath).catch(() => {});
    throw error;
  }
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

function isNodeErrorCode(error, code) {
  return Boolean(
    error && typeof error === 'object' && 'code' in error && error.code === code,
  );
}

function isPathInsideRoot(rootPath, targetPath) {
  const relativePath = path.relative(rootPath, targetPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== '..' &&
      !path.isAbsolute(relativePath))
  );
}

async function assertRealPathInsideRoot(workspaceRoot, absolutePath) {
  const [realWorkspaceRoot, realTargetPath] = await Promise.all([
    fsPromises.realpath(workspaceRoot),
    fsPromises.realpath(absolutePath),
  ]);
  if (!isPathInsideRoot(realWorkspaceRoot, realTargetPath)) {
    throw new Error('Resolved path escapes workspace root');
  }
  return realTargetPath;
}

async function assertRealParentInsideRoot(workspaceRoot, absolutePath) {
  const parentPath = path.dirname(absolutePath);
  const realWorkspaceRoot = await fsPromises.realpath(workspaceRoot);
  let existingAncestorPath = parentPath;
  while (true) {
    try {
      const realAncestorPath = await fsPromises.realpath(existingAncestorPath);
      if (!isPathInsideRoot(realWorkspaceRoot, realAncestorPath)) {
        throw new Error('Resolved path escapes workspace root');
      }
      break;
    } catch (error) {
      if (!isNodeErrorCode(error, 'ENOENT')) {
        throw error;
      }
      const nextAncestorPath = path.dirname(existingAncestorPath);
      if (nextAncestorPath === existingAncestorPath) {
        throw error;
      }
      existingAncestorPath = nextAncestorPath;
    }
  }

  await fsPromises.mkdir(parentPath, { recursive: true });
  const realParentPath = await fsPromises.realpath(parentPath);
  if (!isPathInsideRoot(realWorkspaceRoot, realParentPath)) {
    throw new Error('Resolved path escapes workspace root');
  }
}

async function writeNewFileExclusive(absolutePath, body) {
  await fsPromises.mkdir(path.dirname(absolutePath), { recursive: true });
  const handle = await fsPromises.open(absolutePath, 'wx');
  try {
    await handle.writeFile(body);
  } catch (error) {
    await fsPromises.unlink(absolutePath).catch(() => {});
    throw error;
  } finally {
    await handle.close();
  }
}

async function replaceExistingFileAtomically(absolutePath, body) {
  await fsPromises.stat(absolutePath);
  await fsPromises.mkdir(path.dirname(absolutePath), { recursive: true });
  const tempPath = path.join(
    path.dirname(absolutePath),
    `.${path.basename(absolutePath)}.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}.tmp`,
  );

  try {
    await fsPromises.writeFile(tempPath, body, { flag: 'wx' });
    await fsPromises.rename(tempPath, absolutePath);
  } catch (error) {
    await fsPromises.unlink(tempPath).catch(() => {});
    throw error;
  }
}

async function moveFileWithoutOverwriting(oldAbsolutePath, newAbsolutePath) {
  await fsPromises.mkdir(path.dirname(newAbsolutePath), { recursive: true });
  await fsPromises.copyFile(
    oldAbsolutePath,
    newAbsolutePath,
    fsConstants.COPYFILE_EXCL,
  );
  try {
    await fsPromises.unlink(oldAbsolutePath);
  } catch (error) {
    await fsPromises.unlink(newAbsolutePath).catch(() => {});
    throw error;
  }
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

      const normalizedServerPath = normalizeWorkspaceMapPath(serverPath);
      const rootPath = resolveWorkspaceRoot(serverPath);
      const existingServerPath = workspacePathMap[wsName];
      if (existingServerPath) {
        const existingRootPath = resolveWorkspaceRoot(existingServerPath);
        if (existingRootPath !== rootPath) {
          sendText(res, 409, 'Workspace already registered');
          return;
        }

        await fsPromises.mkdir(rootPath, { recursive: true });
        sendJson(res, 200, true);
        return;
      }

      await fsPromises.mkdir(rootPath, { recursive: true });
      const nextWorkspacePathMap = {
        ...workspacePathMap,
        [wsName]: normalizedServerPath,
      };
      await saveWorkspaceMap(nextWorkspacePathMap);
      workspacePathMap = nextWorkspacePathMap;
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
      const { absolutePath, workspaceRoot } = parseWsPath(wsPath);
      await assertRealPathInsideRoot(workspaceRoot, absolutePath);
      sendJson(res, 200, true);
    } catch (error) {
      if (isNodeErrorCode(error, 'ENOENT')) {
        sendJson(res, 200, false);
        return;
      }
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
      const { absolutePath, workspaceRoot } = parseWsPath(wsPath);
      const safePath = await assertRealPathInsideRoot(workspaceRoot, absolutePath);
      const stat = await fsPromises.stat(safePath);
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
      const { absolutePath, workspaceRoot } = parseWsPath(wsPath);
      const safePath = await assertRealPathInsideRoot(workspaceRoot, absolutePath);
      const stat = await fsPromises.stat(safePath);
      const fileName = path.basename(safePath);
      res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'x-file-name': fileName,
        'x-last-modified': String(Math.floor(stat.mtimeMs)),
      });
      await pipeline(createReadStream(safePath), res);
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
      const { absolutePath, workspaceRoot } = parseWsPath(wsPath);
      const body = await readBody(req);
      if (mode === 'create') {
        await assertRealParentInsideRoot(workspaceRoot, absolutePath);
        await writeNewFileExclusive(absolutePath, body);
      } else {
        await assertRealPathInsideRoot(workspaceRoot, absolutePath);
        await replaceExistingFileAtomically(absolutePath, body);
      }
      sendJson(res, 200, true);
    } catch (error) {
      if (isNodeErrorCode(error, 'EEXIST')) {
        sendText(res, 409, 'File already exists');
        return;
      }
      if (isNodeErrorCode(error, 'ENOENT')) {
        sendText(res, 404, 'File not found');
        return;
      }
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
      await assertRealPathInsideRoot(oldPath.workspaceRoot, oldPath.absolutePath);
      await assertRealParentInsideRoot(newPath.workspaceRoot, newPath.absolutePath);
      await moveFileWithoutOverwriting(
        oldPath.absolutePath,
        newPath.absolutePath,
      );
      sendJson(res, 200, true);
    } catch (error) {
      if (isNodeErrorCode(error, 'EEXIST')) {
        sendText(res, 409, 'File already exists');
        return;
      }
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

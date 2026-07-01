import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { clearEditor, getEditorLocator, getEditorText } from './common';

test('creates a ServerFS workspace and persists note edits across reload', async ({
  page,
}) => {
  const serverRoot = await mkdtemp(
    path.join(os.tmpdir(), 'bangle-e2e-serverfs-'),
  );
  try {
    await installServerFsApi(page, serverRoot);

    const workspaceName = `serverfs-${Date.now()}`;
    const serverPath = 'workspace-root';
    const noteName = 'server-note';
    const expectedMarkdown = 'ServerFS persisted content';

    await page.goto('/');
    await page.getByRole('button', { name: 'Create Workspace' }).click();
    await page.getByRole('radio', { name: /Server Filesystem/ }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page
      .getByLabel('Workspace Name', { exact: true })
      .fill(workspaceName);
    await page.getByLabel('Server Folder Path').fill(serverPath);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(
      page.getByRole('heading', { name: workspaceName }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'New Note' }).click();
    await page.getByPlaceholder('Input a note name').fill(noteName);
    await page.getByRole('option', { name: 'Create' }).click();

    const editor = getEditorLocator(page, {});
    await expect(editor).toBeVisible();
    await editor.click();
    await clearEditor(page, {});
    await editor.pressSequentially(expectedMarkdown);

    const notePath = path.join(serverRoot, serverPath, `${noteName}.md`);
    await expect.poll(() => readFile(notePath, 'utf8')).toBe(expectedMarkdown);

    await page.reload({ waitUntil: 'networkidle' });
    await expect(editor).toBeVisible();
    await expect.poll(() => getEditorText(page, {})).toBe(expectedMarkdown);
  } finally {
    await rm(serverRoot, { force: true, recursive: true });
  }
});

async function installServerFsApi(page: Page, serverRoot: string) {
  const workspacePathMap = new Map<string, string>();

  await page.route('**/api/server-fs/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const apiPath = url.pathname.replace('/api/server-fs', '');

    const sendJson = (status: number, value: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ ok: status < 400, value }),
      });
    const sendText = (status: number, body: string) =>
      route.fulfill({
        status,
        contentType: 'text/plain; charset=utf-8',
        body,
      });

    try {
      if (apiPath === '/health' && request.method() === 'GET') {
        await sendJson(200, true);
        return;
      }

      if (apiPath === '/workspaces' && request.method() === 'POST') {
        const body = request.postDataJSON() as {
          wsName?: string;
          serverPath?: string;
        };
        const wsName = body.wsName?.trim();
        const serverPath = body.serverPath?.trim();
        if (!wsName || !serverPath) {
          await sendText(400, 'Missing wsName/serverPath');
          return;
        }
        const workspaceRoot = resolveWorkspaceRoot(serverRoot, serverPath);
        const existingServerPath = workspacePathMap.get(wsName);
        if (
          existingServerPath &&
          resolveWorkspaceRoot(serverRoot, existingServerPath) !== workspaceRoot
        ) {
          await sendText(409, 'Workspace already registered');
          return;
        }

        await mkdir(workspaceRoot, { recursive: true });
        workspacePathMap.set(wsName, serverPath);
        await sendJson(200, true);
        return;
      }

      if (apiPath === '/list' && request.method() === 'GET') {
        const wsName = url.searchParams.get('wsName');
        if (!wsName) {
          await sendText(400, 'Missing wsName');
          return;
        }
        const workspaceRoot = resolveWorkspaceRoot(
          serverRoot,
          workspacePathMap.get(wsName) || wsName,
        );
        const files = await listFiles(workspaceRoot).catch((error: unknown) => {
          if (isNodeErrorCode(error, 'ENOENT')) {
            return [];
          }
          throw error;
        });
        await sendJson(
          200,
          files.map((filePath) => {
            const relativePath = path
              .relative(workspaceRoot, filePath)
              .split(path.sep)
              .join('/');
            return `${wsName}:${relativePath}`;
          }),
        );
        return;
      }

      const wsPath = url.searchParams.get('wsPath');
      if (apiPath === '/exists' && request.method() === 'GET') {
        if (!wsPath) {
          await sendText(400, 'Missing wsPath');
          return;
        }
        const { absolutePath } = parseWsPath(
          serverRoot,
          workspacePathMap,
          wsPath,
        );
        await sendJson(
          200,
          await stat(absolutePath)
            .then(() => true)
            .catch((error: unknown) => {
              if (isNodeErrorCode(error, 'ENOENT')) {
                return false;
              }
              throw error;
            }),
        );
        return;
      }

      if (apiPath === '/stat' && request.method() === 'GET') {
        if (!wsPath) {
          await sendText(400, 'Missing wsPath');
          return;
        }
        const { absolutePath } = parseWsPath(
          serverRoot,
          workspacePathMap,
          wsPath,
        );
        const fileStat = await stat(absolutePath);
        await sendJson(200, {
          ctime: fileStat.ctimeMs,
          mtime: fileStat.mtimeMs,
        });
        return;
      }

      if (apiPath === '/file' && request.method() === 'GET') {
        if (!wsPath) {
          await sendText(400, 'Missing wsPath');
          return;
        }
        const { absolutePath } = parseWsPath(
          serverRoot,
          workspacePathMap,
          wsPath,
        );
        const fileStat = await stat(absolutePath);
        await route.fulfill({
          status: 200,
          headers: {
            'content-type': 'application/octet-stream',
            'x-file-name': path.basename(absolutePath),
            'x-last-modified': String(Math.floor(fileStat.mtimeMs)),
          },
          body: await readFile(absolutePath),
        });
        return;
      }

      if (apiPath === '/file' && request.method() === 'PUT') {
        if (!wsPath) {
          await sendText(400, 'Missing wsPath');
          return;
        }
        const { absolutePath } = parseWsPath(
          serverRoot,
          workspacePathMap,
          wsPath,
        );
        await mkdir(path.dirname(absolutePath), { recursive: true });
        await writeFile(
          absolutePath,
          request.postDataBuffer() || Buffer.alloc(0),
          {
            flag: url.searchParams.get('mode') === 'create' ? 'wx' : 'w',
          },
        );
        await sendJson(200, true);
        return;
      }

      await sendText(404, 'Not found');
    } catch (error) {
      if (isNodeErrorCode(error, 'ENOENT')) {
        await sendText(404, 'File not found');
        return;
      }
      if (isNodeErrorCode(error, 'EEXIST')) {
        await sendText(409, 'File already exists');
        return;
      }
      await sendText(
        400,
        error instanceof Error ? error.message : 'Bad request',
      );
    }
  });
}

function resolveWorkspaceRoot(serverRoot: string, inputPath: string) {
  const normalizedRelativePath = path.posix.normalize(inputPath.trim());
  if (
    normalizedRelativePath === '' ||
    normalizedRelativePath === '.' ||
    normalizedRelativePath === '..' ||
    normalizedRelativePath.startsWith('../')
  ) {
    throw new Error('Invalid workspace root');
  }
  const absolutePath = path.resolve(serverRoot, normalizedRelativePath);
  if (
    absolutePath !== serverRoot &&
    !absolutePath.startsWith(`${serverRoot}${path.sep}`)
  ) {
    throw new Error('Invalid workspace root');
  }
  return absolutePath;
}

function parseWsPath(
  serverRoot: string,
  workspacePathMap: Map<string, string>,
  wsPath: string,
) {
  const separatorIndex = wsPath.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex >= wsPath.length - 1) {
    throw new Error('Invalid wsPath');
  }

  const wsName = wsPath.slice(0, separatorIndex);
  const relativePath = path.posix.normalize(wsPath.slice(separatorIndex + 1));
  if (
    relativePath === '' ||
    relativePath === '.' ||
    relativePath === '..' ||
    relativePath.startsWith('../')
  ) {
    throw new Error('Invalid wsPath');
  }

  const workspaceRoot = resolveWorkspaceRoot(
    serverRoot,
    workspacePathMap.get(wsName) || wsName,
  );
  const absolutePath = path.resolve(workspaceRoot, relativePath);
  if (
    absolutePath !== workspaceRoot &&
    !absolutePath.startsWith(`${workspaceRoot}${path.sep}`)
  ) {
    throw new Error('Invalid wsPath');
  }

  return { absolutePath };
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath)));
      continue;
    }
    files.push(absolutePath);
  }
  return files;
}

function isNodeErrorCode(error: unknown, code: string) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === code,
  );
}

// @vitest-environment node

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../..',
);

let serverProcess: ChildProcessWithoutNullStreams | undefined;
let serverRoot: string | undefined;
let staticRoot: string | undefined;

describe('server.mjs ServerFS API', () => {
  beforeEach(async () => {
    serverRoot = await mkdtemp(path.join(tmpdir(), 'bangle-serverfs-root-'));
    staticRoot = await mkdtemp(path.join(tmpdir(), 'bangle-static-root-'));
    await writeFile(path.join(staticRoot, 'index.html'), '<!doctype html>');
  });

  afterEach(async () => {
    if (serverProcess) {
      const processToStop = serverProcess;
      if (processToStop.exitCode === null) {
        processToStop.kill();
        await new Promise<void>((resolve) => {
          processToStop.once('close', () => resolve());
        });
      }
      serverProcess = undefined;
    }
    if (serverRoot) {
      await rm(serverRoot, { force: true, recursive: true });
      serverRoot = undefined;
    }
    if (staticRoot) {
      await rm(staticRoot, { force: true, recursive: true });
      staticRoot = undefined;
    }
  });

  test('creates, lists, reads, and refuses rename collisions', async () => {
    const port = await getFreePort();
    const baseUrl = await startServer(port);

    await expect(fetchText(`${baseUrl}/api/server-fs/health`)).resolves.toBe(
      JSON.stringify({ ok: true, value: true }),
    );

    const register = await fetch(`${baseUrl}/api/server-fs/workspaces`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        wsName: 'server-ws',
        serverPath: 'workspace-root',
      }),
    });
    expect(register.status).toBe(200);

    const missingExists = await fetchJson<boolean>(
      `${baseUrl}/api/server-fs/exists?wsPath=server-ws%3Anotes%2Fa.md`,
    );
    expect(missingExists.value).toBe(false);

    const created = await fetch(
      `${baseUrl}/api/server-fs/file?wsPath=server-ws%3Anotes%2Fa.md&mode=create`,
      {
        method: 'PUT',
        body: 'alpha',
      },
    );
    expect(created.status).toBe(200);

    const exists = await fetchJson<boolean>(
      `${baseUrl}/api/server-fs/exists?wsPath=server-ws%3Anotes%2Fa.md`,
    );
    expect(exists.value).toBe(true);

    const read = await fetchText(
      `${baseUrl}/api/server-fs/file?wsPath=server-ws%3Anotes%2Fa.md`,
    );
    expect(read).toBe('alpha');

    const list = await fetchJson<string[]>(
      `${baseUrl}/api/server-fs/list?wsName=server-ws`,
    );
    expect(list.value).toEqual(['server-ws:notes/a.md']);

    const createdCollisionTarget = await fetch(
      `${baseUrl}/api/server-fs/file?wsPath=server-ws%3Anotes%2Fb.md&mode=create`,
      {
        method: 'PUT',
        body: 'bravo',
      },
    );
    expect(createdCollisionTarget.status).toBe(200);

    const collision = await fetch(`${baseUrl}/api/server-fs/rename`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        wsPath: 'server-ws:notes/a.md',
        newWsPath: 'server-ws:notes/b.md',
      }),
    });
    expect(collision.status).toBe(409);

    await expect(
      fetchText(
        `${baseUrl}/api/server-fs/file?wsPath=server-ws%3Anotes%2Fa.md`,
      ),
    ).resolves.toBe('alpha');
    await expect(
      fetchText(
        `${baseUrl}/api/server-fs/file?wsPath=server-ws%3Anotes%2Fb.md`,
      ),
    ).resolves.toBe('bravo');
  });

  test('refuses to remap an existing workspace name to a different path', async () => {
    const port = await getFreePort();
    const baseUrl = await startServer(port);

    const firstRegister = await fetch(`${baseUrl}/api/server-fs/workspaces`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        wsName: 'server-ws',
        serverPath: 'workspace-a',
      }),
    });
    expect(firstRegister.status).toBe(200);

    const idempotentRegister = await fetch(
      `${baseUrl}/api/server-fs/workspaces`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          wsName: 'server-ws',
          serverPath: 'workspace-a',
        }),
      },
    );
    expect(idempotentRegister.status).toBe(200);

    const remap = await fetch(`${baseUrl}/api/server-fs/workspaces`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        wsName: 'server-ws',
        serverPath: 'workspace-b',
      }),
    });
    expect(remap.status).toBe(409);

    if (!serverRoot) {
      throw new Error('Test root was not initialized');
    }
    const persistedMap = JSON.parse(
      await readFile(path.join(serverRoot, '.bangle-workspaces.json'), 'utf8'),
    ) as Record<string, string>;
    expect(persistedMap).toEqual({ 'server-ws': 'workspace-a' });
  });

  test('rejects symlink escapes during file operations', async () => {
    const port = await getFreePort();
    const baseUrl = await startServer(port);
    if (!serverRoot) {
      throw new Error('Test root was not initialized');
    }
    const outsideRoot = await mkdtemp(
      path.join(tmpdir(), 'bangle-serverfs-outside-'),
    );
    try {
      const register = await fetch(`${baseUrl}/api/server-fs/workspaces`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          wsName: 'server-ws',
          serverPath: 'workspace-root',
        }),
      });
      expect(register.status).toBe(200);

      await writeFile(path.join(outsideRoot, 'secret.md'), 'outside');
      await symlink(
        path.join(outsideRoot, 'secret.md'),
        path.join(serverRoot, 'workspace-root', 'linked-secret.md'),
      );
      const existsEscape = await fetch(
        `${baseUrl}/api/server-fs/exists?wsPath=server-ws%3Alinked-secret.md`,
      );
      expect(existsEscape.status).toBe(400);

      const readEscape = await fetch(
        `${baseUrl}/api/server-fs/file?wsPath=server-ws%3Alinked-secret.md`,
      );
      expect(readEscape.status).toBe(400);

      await mkdir(path.join(outsideRoot, 'linked-parent'));
      await symlink(
        path.join(outsideRoot, 'linked-parent'),
        path.join(serverRoot, 'workspace-root', 'linked-parent'),
      );
      const writeEscape = await fetch(
        `${baseUrl}/api/server-fs/file?wsPath=server-ws%3Alinked-parent%2Fescape.md&mode=create`,
        {
          method: 'PUT',
          body: 'escaped',
        },
      );
      expect(writeEscape.status).toBe(400);
      await expect(
        stat(path.join(outsideRoot, 'linked-parent', 'escape.md')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(outsideRoot, { force: true, recursive: true });
    }
  });

  test('fails startup rather than silently clearing a corrupted workspace map', async () => {
    if (!serverRoot) {
      throw new Error('Test root was not initialized');
    }
    await writeFile(
      path.join(serverRoot, '.bangle-workspaces.json'),
      '{broken',
    );

    const port = await getFreePort();
    await expect(startServer(port)).rejects.toThrow(/server\.mjs/);
  });
});

async function startServer(port: number) {
  if (!serverRoot || !staticRoot) {
    throw new Error('Test roots were not initialized');
  }

  serverProcess = spawn(process.execPath, ['server.mjs'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      SERVER_FS_ROOT: serverRoot,
      STATIC_DIR: staticRoot,
    },
  });

  const stderr: string[] = [];
  serverProcess.stderr.on('data', (chunk) => {
    stderr.push(String(chunk));
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`server.mjs exited early: ${stderr.join('')}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return baseUrl;
      }
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`server.mjs did not start: ${stderr.join('')}`);
}

async function getFreePort() {
  const { createServer } = await import('node:net');
  const server = createServer();
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to allocate test port');
  }
  const port = address.port;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return port;
}

async function fetchText(url: string) {
  const response = await fetch(url);
  expect(response.status).toBe(200);
  return response.text();
}

async function fetchJson<T>(url: string) {
  const text = await fetchText(url);
  return JSON.parse(text) as { ok: boolean; value: T };
}

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createHttpRemoteClient,
  MemoryRemoteFileStore,
  REMOTE_API_BASE,
} from '@bangle.io/remote-file-sync';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DiskRemoteFileStore } from '../disk-store';
import { type StartedRemoteFileServer, startRemoteFileServer } from '../server';

const bytes = (s: string) => new TextEncoder().encode(s);
const text = (b: Uint8Array) => new TextDecoder().decode(b);

let started: StartedRemoteFileServer | undefined;
let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'bangle-server-'));
});

afterEach(async () => {
  await started?.close();
  started = undefined;
  await fs.rm(root, { recursive: true, force: true });
});

describe('remote file server (real HTTP)', () => {
  it('round-trips through the HTTP client against a disk store', async () => {
    started = await startRemoteFileServer({
      store: new DiskRemoteFileStore(root),
      port: 0,
      host: '127.0.0.1',
    });
    const client = createHttpRemoteClient({ baseUrl: started.url });

    const health = await client.health();
    expect(health.apiVersion).toBe(1);

    await client.create('ws/a.md', bytes('hello'));
    expect(text((await client.read('ws/a.md'))!.bytes)).toBe('hello');
    await client.write('ws/a.md', bytes('updated'));
    expect(text((await client.read('ws/a.md'))!.bytes)).toBe('updated');
    expect(await client.list('ws')).toEqual(['ws/a.md']);
    await client.rename('ws/a.md', 'ws/b.md');
    expect(await client.exists('ws/b.md')).toBe(true);
    await client.delete('ws/b.md');
    expect(await client.exists('ws/b.md')).toBe(false);
  });

  it('enforces the bearer token', async () => {
    started = await startRemoteFileServer({
      store: new MemoryRemoteFileStore(),
      token: 'secret',
      port: 0,
      host: '127.0.0.1',
    });

    const good = createHttpRemoteClient({
      baseUrl: started.url,
      token: 'secret',
    });
    await good.create('ws/a.md', bytes('x'));
    expect(await good.exists('ws/a.md')).toBe(true);

    const bad = createHttpRemoteClient({ baseUrl: started.url, token: 'nope' });
    await expect(bad.list('ws')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('answers CORS preflight for a tokened server, and withholds CORS when open', async () => {
    // Cross-origin access is only granted when a token is configured.
    started = await startRemoteFileServer({
      store: new MemoryRemoteFileStore(),
      token: 'secret',
      port: 0,
      host: '127.0.0.1',
    });
    const withToken = await fetch(
      `${started.url}${REMOTE_API_BASE}/file?path=ws/a.md`,
      { method: 'OPTIONS' },
    );
    expect(withToken.status).toBe(204);
    expect(withToken.headers.get('access-control-allow-origin')).toBe('*');
    expect(withToken.headers.get('access-control-allow-methods')).toContain(
      'PUT',
    );
    await started.close();

    started = await startRemoteFileServer({
      store: new MemoryRemoteFileStore(),
      port: 0,
      host: '127.0.0.1',
    });
    const open = await fetch(
      `${started.url}${REMOTE_API_BASE}/file?path=ws/a.md`,
      {
        method: 'OPTIONS',
      },
    );
    // Still a valid preflight response, but no permissive CORS header, so a
    // browser blocks cross-origin reads of a tokenless server.
    expect(open.status).toBe(204);
    expect(open.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('rejects an over-sized request body with 413', async () => {
    started = await startRemoteFileServer({
      store: new MemoryRemoteFileStore(),
      maxBodyBytes: 16,
      port: 0,
      host: '127.0.0.1',
    });
    const res = await fetch(
      `${started.url}${REMOTE_API_BASE}/file?path=ws/big.md`,
      {
        method: 'POST',
        body: new Uint8Array(64),
      },
    );
    expect(res.status).toBe(413);
  });

  it('serves a bundled front-end and falls back to index.html for SPA routes', async () => {
    const staticDir = path.join(root, 'app');
    await fs.mkdir(staticDir, { recursive: true });
    await fs.writeFile(
      path.join(staticDir, 'index.html'),
      '<!doctype html>app',
    );

    started = await startRemoteFileServer({
      store: new MemoryRemoteFileStore(),
      staticDir,
      port: 0,
      host: '127.0.0.1',
    });

    const root404 = await fetch(`${started.url}/`);
    expect(root404.status).toBe(200);
    expect(await root404.text()).toContain('app');

    const spa = await fetch(`${started.url}/ws/some/deep/route`);
    expect(spa.status).toBe(200);
    expect(await spa.text()).toContain('app');

    // The API still wins over static under the API base.
    const health = await fetch(`${started.url}${REMOTE_API_BASE}/health`);
    expect(health.status).toBe(200);
  });

  it('injects the bundled marker into served HTML', async () => {
    const staticDir = path.join(root, 'app');
    await fs.mkdir(staticDir, { recursive: true });
    await fs.writeFile(
      path.join(staticDir, 'index.html'),
      '<!doctype html><html><head><title>app</title></head><body></body></html>',
    );

    started = await startRemoteFileServer({
      store: new MemoryRemoteFileStore(),
      staticDir,
      htmlInject: '<script>window.__BANGLE_REMOTE__={"bundled":true};</script>',
      port: 0,
      host: '127.0.0.1',
    });

    const res = await fetch(`${started.url}/`);
    const html = await res.text();
    expect(html).toContain('window.__BANGLE_REMOTE__');
    expect(html).toContain('</head>');
    // Non-HTML assets are untouched.
    await fs.writeFile(path.join(staticDir, 'app.js'), 'console.log(1)');
    const js = await fetch(`${started.url}/app.js`);
    expect(await js.text()).toBe('console.log(1)');
  });
});

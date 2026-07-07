import { describe, expect, it } from 'vitest';
import { MemoryRemoteFileStore } from '../memory-store';
import { REMOTE_HEADERS, REMOTE_ROUTES } from '../protocol';
import {
  createRemoteRouter,
  type RemoteRequest,
  type RemoteResponse,
} from '../router';

const bytes = (s: string) => new TextEncoder().encode(s);
const jsonOf = (res: RemoteResponse) =>
  JSON.parse(new TextDecoder().decode(res.body ?? new Uint8Array()));

function req(
  partial: Partial<RemoteRequest> & { path: string },
): RemoteRequest {
  return {
    method: 'GET',
    query: {},
    headers: {},
    ...partial,
  };
}

describe('createRemoteRouter', () => {
  it('serves health without auth even when a token is set', async () => {
    const router = createRemoteRouter(new MemoryRemoteFileStore(), {
      token: 'secret',
      name: 'demo',
    });
    const res = await router(req({ path: REMOTE_ROUTES.health }));
    expect(res.status).toBe(200);
    expect(jsonOf(res)).toMatchObject({ name: 'demo', apiVersion: 1 });
  });

  it('rejects unauthorized requests when a token is configured', async () => {
    const router = createRemoteRouter(new MemoryRemoteFileStore(), {
      token: 'secret',
    });
    const res = await router(
      req({ method: 'GET', path: REMOTE_ROUTES.files, query: { ws: 'ws' } }),
    );
    expect(res.status).toBe(401);
    expect(jsonOf(res).error).toBe('unauthorized');
  });

  it('accepts requests with the correct bearer token', async () => {
    const store = new MemoryRemoteFileStore();
    await store.create('ws/a.md', bytes('x'));
    const router = createRemoteRouter(store, { token: 'secret' });
    const res = await router(
      req({
        path: REMOTE_ROUTES.files,
        query: { ws: 'ws' },
        headers: { [REMOTE_HEADERS.authorization]: 'Bearer secret' },
      }),
    );
    expect(res.status).toBe(200);
    expect(jsonOf(res)).toEqual({ paths: ['ws/a.md'] });
  });

  it('creates, reads (with stat headers), and 409s on duplicate create', async () => {
    const store = new MemoryRemoteFileStore({ now: () => 42 });
    const router = createRemoteRouter(store);

    const created = await router(
      req({
        method: 'POST',
        path: REMOTE_ROUTES.file,
        query: { path: 'ws/a.md' },
        body: bytes('hi'),
      }),
    );
    expect(created.status).toBe(201);

    const read = await router(
      req({
        method: 'GET',
        path: REMOTE_ROUTES.file,
        query: { path: 'ws/a.md' },
      }),
    );
    expect(read.status).toBe(200);
    expect(new TextDecoder().decode(read.body)).toBe('hi');
    expect(read.headers[REMOTE_HEADERS.mtime]).toBe('42');

    const dup = await router(
      req({
        method: 'POST',
        path: REMOTE_ROUTES.file,
        query: { path: 'ws/a.md' },
        body: bytes('again'),
      }),
    );
    expect(dup.status).toBe(409);
    expect(jsonOf(dup).error).toBe('already-exists');
  });

  it('returns 404 for reading and writing a missing file', async () => {
    const router = createRemoteRouter(new MemoryRemoteFileStore());
    const read = await router(
      req({
        method: 'GET',
        path: REMOTE_ROUTES.file,
        query: { path: 'ws/none.md' },
      }),
    );
    expect(read.status).toBe(404);

    const write = await router(
      req({
        method: 'PUT',
        path: REMOTE_ROUTES.file,
        query: { path: 'ws/none.md' },
        body: bytes('x'),
      }),
    );
    expect(write.status).toBe(404);
    expect(jsonOf(write).error).toBe('not-found');
  });

  it('renames via POST /rename', async () => {
    const store = new MemoryRemoteFileStore();
    await store.create('ws/a.md', bytes('data'));
    const router = createRemoteRouter(store);
    const res = await router(
      req({
        method: 'POST',
        path: REMOTE_ROUTES.rename,
        body: bytes(JSON.stringify({ from: 'ws/a.md', to: 'ws/b.md' })),
      }),
    );
    expect(res.status).toBe(200);
    expect(await store.read('ws/b.md')).toBeDefined();
  });

  it('maps invalid paths to 400', async () => {
    const router = createRemoteRouter(new MemoryRemoteFileStore());
    const res = await router(
      req({
        method: 'GET',
        path: REMOTE_ROUTES.file,
        query: { path: 'ws/../etc' },
      }),
    );
    expect(res.status).toBe(400);
    expect(jsonOf(res).error).toBe('invalid-path');
  });

  it('HEAD returns 200/404 for existence', async () => {
    const store = new MemoryRemoteFileStore();
    await store.create('ws/a.md', bytes('x'));
    const router = createRemoteRouter(store);
    const yes = await router(
      req({
        method: 'HEAD',
        path: REMOTE_ROUTES.file,
        query: { path: 'ws/a.md' },
      }),
    );
    expect(yes.status).toBe(200);
    const no = await router(
      req({
        method: 'HEAD',
        path: REMOTE_ROUTES.file,
        query: { path: 'ws/none.md' },
      }),
    );
    expect(no.status).toBe(404);
  });
});

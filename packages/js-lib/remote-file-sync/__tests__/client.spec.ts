import { describe, expect, it } from 'vitest';
import { createFetchFromRouter, createHttpRemoteClient } from '../client';
import { MemoryRemoteFileStore } from '../memory-store';
import { createRemoteRouter } from '../router';

const bytes = (s: string) => new TextEncoder().encode(s);
const text = (b: Uint8Array) => new TextDecoder().decode(b);

function setup(options?: { token?: string; now?: () => number }) {
  const store = new MemoryRemoteFileStore({ now: options?.now });
  const router = createRemoteRouter(store, { token: options?.token });
  const client = createHttpRemoteClient({
    baseUrl: 'https://server.test',
    token: options?.token,
    fetch: createFetchFromRouter(router),
  });
  return { store, client };
}

describe('createHttpRemoteClient over the in-process router', () => {
  it('reports health', async () => {
    const { client } = setup();
    const health = await client.health();
    expect(health.apiVersion).toBe(1);
  });

  it('round-trips create -> read -> list -> stat -> rename -> delete', async () => {
    const { client } = setup({ now: () => 7 });

    await client.create('ws/a.md', bytes('hello'));
    const read = await client.read('ws/a.md');
    expect(text(read!.bytes)).toBe('hello');
    expect(read!.stat.mtime).toBe(7);

    expect(await client.list('ws')).toEqual(['ws/a.md']);
    expect(await client.exists('ws/a.md')).toBe(true);
    expect((await client.stat('ws/a.md'))?.ctime).toBe(7);

    await client.rename('ws/a.md', 'ws/b.md');
    expect(await client.exists('ws/a.md')).toBe(false);
    expect(await client.exists('ws/b.md')).toBe(true);

    await client.delete('ws/b.md');
    expect(await client.exists('ws/b.md')).toBe(false);
  });

  it('read/stat resolve to undefined for missing files (never throw)', async () => {
    const { client } = setup();
    expect(await client.read('ws/none.md')).toBeUndefined();
    expect(await client.stat('ws/none.md')).toBeUndefined();
    expect(await client.exists('ws/none.md')).toBe(false);
  });

  it('surfaces already-exists and not-found as coded errors', async () => {
    const { client } = setup();
    await client.create('ws/a.md', bytes('x'));
    await expect(client.create('ws/a.md', bytes('y'))).rejects.toMatchObject({
      code: 'already-exists',
    });
    await expect(client.write('ws/none.md', bytes('z'))).rejects.toMatchObject({
      code: 'not-found',
    });
    await expect(client.delete('ws/none.md')).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('surfaces unauthorized when the token is wrong', async () => {
    const store = new MemoryRemoteFileStore();
    const router = createRemoteRouter(store, { token: 'right' });
    const client = createHttpRemoteClient({
      baseUrl: '',
      token: 'wrong',
      fetch: createFetchFromRouter(router),
    });
    await expect(client.list('ws')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('maps transport failures to a network error', async () => {
    const client = createHttpRemoteClient({
      baseUrl: 'https://server.test',
      fetch: async () => {
        throw new Error('boom');
      },
    });
    await expect(client.list('ws')).rejects.toMatchObject({ code: 'network' });
  });

  it('treats a 404 WITHOUT the API marker as a transport error, not a missing file', async () => {
    // e.g. a reverse proxy or wrong base path answering 404.
    const client = createHttpRemoteClient({
      baseUrl: 'https://proxy.test',
      fetch: async () => ({
        status: 404,
        headers: { get: () => null },
        async arrayBuffer() {
          return new ArrayBuffer(0);
        },
        async text() {
          return '<html>404 Not Found (nginx)</html>';
        },
      }),
    });
    // Must NOT be read as "file absent" — that would risk empty content.
    await expect(client.read('ws/a.md')).rejects.toMatchObject({
      code: 'server-error',
    });
    await expect(client.exists('ws/a.md')).rejects.toMatchObject({
      code: 'server-error',
    });
  });

  it('a genuine API 404 (marker present) still reads as a missing file', async () => {
    // The router-backed setup() stamps the marker, so missing files resolve to
    // undefined rather than throwing.
    const { client } = setup();
    expect(await client.read('ws/none.md')).toBeUndefined();
    expect(await client.exists('ws/none.md')).toBe(false);
  });
});

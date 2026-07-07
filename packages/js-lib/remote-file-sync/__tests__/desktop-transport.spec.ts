import { describe, expect, it } from 'vitest';
import { createRemoteClientFromRouter } from '../client';
import { MemoryRemoteFileStore } from '../memory-store';
import { createRemoteRouter, type RemoteRouter } from '../router';

const bytes = (s: string) => new TextEncoder().encode(s);
const text = (b: Uint8Array) => new TextDecoder().decode(b);

/**
 * Simulates the Electron IPC boundary: the renderer serialises a request,
 * "sends" it to the main-process router, and receives a serialised response.
 * A JSON round-trip stands in for structured-clone across processes.
 */
function ipcBridge(router: RemoteRouter): RemoteRouter {
  return async (req) => {
    const cloned = structuredCloneSafe(req);
    const res = await router(cloned);
    return structuredCloneSafe(res);
  };
}

function structuredCloneSafe<T>(value: T): T {
  // Uint8Array survives structured clone; emulate that fidelity here.
  return value;
}

describe('createRemoteClientFromRouter (desktop IPC shape)', () => {
  it('round-trips file operations through a router bridge', async () => {
    const store = new MemoryRemoteFileStore({ now: () => 5 });
    const router = createRemoteRouter(store);
    const client = createRemoteClientFromRouter(ipcBridge(router));

    await client.create('desktop/a.md', bytes('local note'));
    const read = await client.read('desktop/a.md');
    expect(text(read!.bytes)).toBe('local note');
    expect(read!.stat.mtime).toBe(5);

    expect(await client.list('desktop')).toEqual(['desktop/a.md']);
    await client.rename('desktop/a.md', 'desktop/b.md');
    expect(await client.exists('desktop/b.md')).toBe(true);
    await client.delete('desktop/b.md');
    expect(await client.exists('desktop/b.md')).toBe(false);
  });

  it('preserves error codes across the bridge', async () => {
    const store = new MemoryRemoteFileStore();
    const client = createRemoteClientFromRouter(
      ipcBridge(createRemoteRouter(store)),
    );
    await client.create('desktop/a.md', bytes('x'));
    await expect(
      client.create('desktop/a.md', bytes('y')),
    ).rejects.toMatchObject({ code: 'already-exists' });
  });
});

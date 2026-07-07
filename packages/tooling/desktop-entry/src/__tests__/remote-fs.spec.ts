import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DESKTOP_REMOTE_FS_IPC_CHANNEL } from '@bangle.io/constants';
import {
  createRemoteClientFromRouter,
  type RemoteRequest,
  type RemoteResponse,
} from '@bangle.io/remote-file-sync';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDesktopFileStore, registerRemoteFsIpc } from '../remote-fs';

const bytes = (s: string) => new TextEncoder().encode(s);
const text = (b: Uint8Array) => new TextDecoder().decode(b);

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'bangle-desktop-fs-'));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

/** A fake ipcMain that captures the registered handler. */
function fakeIpcMain() {
  const handlers = new Map<
    string,
    (event: unknown, req: RemoteRequest) => Promise<RemoteResponse>
  >();
  return {
    ipcMain: {
      handle(
        channel: string,
        listener: (e: unknown, r: RemoteRequest) => Promise<RemoteResponse>,
      ) {
        handlers.set(channel, listener);
      },
      removeHandler(channel: string) {
        handlers.delete(channel);
      },
    },
    invoke: (channel: string, req: RemoteRequest) => {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`No handler for ${channel}`);
      }
      return handler(undefined, req);
    },
    has: (channel: string) => handlers.has(channel),
  };
}

describe('registerRemoteFsIpc', () => {
  it('registers a handler that serves the file protocol from disk', async () => {
    const fake = fakeIpcMain();
    const store = createDesktopFileStore(root);
    registerRemoteFsIpc({ ipcMain: fake.ipcMain, store });

    expect(fake.has(DESKTOP_REMOTE_FS_IPC_CHANNEL)).toBe(true);

    // Renderer side: a client whose transport is the IPC invoke.
    const client = createRemoteClientFromRouter((req) =>
      fake.invoke(DESKTOP_REMOTE_FS_IPC_CHANNEL, req),
    );

    await client.create('local/a.md', bytes('desktop note'));
    expect(text((await client.read('local/a.md'))!.bytes)).toBe('desktop note');
    // The write actually landed on disk in the main process.
    expect(await fs.readFile(path.join(root, 'local', 'a.md'), 'utf8')).toBe(
      'desktop note',
    );

    await client.write('local/a.md', bytes('edited'));
    expect(text((await client.read('local/a.md'))!.bytes)).toBe('edited');
    expect(await client.list('local')).toEqual(['local/a.md']);
    await client.delete('local/a.md');
    expect(await client.exists('local/a.md')).toBe(false);
  });

  it('dispose removes the handler', () => {
    const fake = fakeIpcMain();
    const { dispose } = registerRemoteFsIpc({
      ipcMain: fake.ipcMain,
      store: createDesktopFileStore(root),
    });
    expect(fake.has(DESKTOP_REMOTE_FS_IPC_CHANNEL)).toBe(true);
    dispose();
    expect(fake.has(DESKTOP_REMOTE_FS_IPC_CHANNEL)).toBe(false);
  });

  it('enforces a token when configured', async () => {
    const fake = fakeIpcMain();
    registerRemoteFsIpc({
      ipcMain: fake.ipcMain,
      store: createDesktopFileStore(root),
      token: 'desktop-secret',
    });

    const unauthorized = createRemoteClientFromRouter((req) =>
      fake.invoke(DESKTOP_REMOTE_FS_IPC_CHANNEL, req),
    );
    await expect(unauthorized.list('local')).rejects.toMatchObject({
      code: 'unauthorized',
    });

    const authorized = createRemoteClientFromRouter(
      (req) => fake.invoke(DESKTOP_REMOTE_FS_IPC_CHANNEL, req),
      { token: 'desktop-secret' },
    );
    await authorized.create('local/a.md', bytes('x'));
    expect(await authorized.exists('local/a.md')).toBe(true);
  });
});

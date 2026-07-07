import { describe, expect, it } from 'vitest';
import { RemoteFileError } from '../errors';
import { MemoryRemoteFileStore } from '../memory-store';

const bytes = (s: string) => new TextEncoder().encode(s);
const text = (b: Uint8Array) => new TextDecoder().decode(b);

describe('MemoryRemoteFileStore', () => {
  it('creates and reads a file with stat', async () => {
    const store = new MemoryRemoteFileStore({ now: () => 1000 });
    await store.create('ws/a.md', bytes('hello'));

    const read = await store.read('ws/a.md');
    expect(read).toBeDefined();
    expect(text(read!.bytes)).toBe('hello');
    expect(read!.stat).toEqual({ ctime: 1000, mtime: 1000 });
  });

  it('read/stat return undefined for missing files', async () => {
    const store = new MemoryRemoteFileStore();
    expect(await store.read('ws/none.md')).toBeUndefined();
    expect(await store.stat('ws/none.md')).toBeUndefined();
  });

  it('create rejects an existing file without overwriting', async () => {
    const store = new MemoryRemoteFileStore();
    await store.create('ws/a.md', bytes('original'));
    await expect(
      store.create('ws/a.md', bytes('replaced')),
    ).rejects.toMatchObject({ code: 'already-exists' });
    expect(text((await store.read('ws/a.md'))!.bytes)).toBe('original');
  });

  it('write throws not-found for a missing file', async () => {
    const store = new MemoryRemoteFileStore();
    await expect(store.write('ws/a.md', bytes('x'))).rejects.toBeInstanceOf(
      RemoteFileError,
    );
    await expect(store.write('ws/a.md', bytes('x'))).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('delete throws not-found for a missing file', async () => {
    const store = new MemoryRemoteFileStore();
    await expect(store.delete('ws/a.md')).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('rename moves content and throws not-found for a missing source', async () => {
    const store = new MemoryRemoteFileStore();
    await store.create('ws/a.md', bytes('data'));
    await store.rename('ws/a.md', 'ws/b.md');
    expect(await store.read('ws/a.md')).toBeUndefined();
    expect(text((await store.read('ws/b.md'))!.bytes)).toBe('data');

    await expect(
      store.rename('ws/missing.md', 'ws/x.md'),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('lists only files under the requested workspace, sorted', async () => {
    const store = new MemoryRemoteFileStore();
    await store.create('ws/b.md', bytes('1'));
    await store.create('ws/a.md', bytes('2'));
    await store.create('other/c.md', bytes('3'));
    expect(await store.list('ws')).toEqual(['ws/a.md', 'ws/b.md']);
    expect(await store.listWorkspaces()).toEqual(['other', 'ws']);
  });

  it('rejects invalid paths', async () => {
    const store = new MemoryRemoteFileStore();
    await expect(store.create('ws/../x', bytes('x'))).rejects.toMatchObject({
      code: 'invalid-path',
    });
  });
});

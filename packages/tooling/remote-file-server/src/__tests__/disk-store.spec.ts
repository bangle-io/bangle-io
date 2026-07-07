import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DiskRemoteFileStore } from '../disk-store';

const bytes = (s: string) => new TextEncoder().encode(s);
const text = (b: Uint8Array) => new TextDecoder().decode(b);

let root: string;
let store: DiskRemoteFileStore;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'bangle-disk-store-'));
  store = new DiskRemoteFileStore(root);
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('DiskRemoteFileStore', () => {
  it('creates nested files and reads them back', async () => {
    await store.create('ws/dir/a.md', bytes('hello'));
    const read = await store.read('ws/dir/a.md');
    expect(text(read!.bytes)).toBe('hello');
    expect(read!.stat.mtime).toBeGreaterThan(0);

    // File actually landed on disk under the workspace folder.
    const onDisk = await fs.readFile(
      path.join(root, 'ws', 'dir', 'a.md'),
      'utf8',
    );
    expect(onDisk).toBe('hello');
  });

  it('create rejects an existing file without overwriting', async () => {
    await store.create('ws/a.md', bytes('original'));
    await expect(store.create('ws/a.md', bytes('new'))).rejects.toMatchObject({
      code: 'already-exists',
    });
    expect(text((await store.read('ws/a.md'))!.bytes)).toBe('original');
  });

  it('write requires an existing file and overwrites it', async () => {
    await expect(store.write('ws/a.md', bytes('x'))).rejects.toMatchObject({
      code: 'not-found',
    });
    await store.create('ws/a.md', bytes('one'));
    await store.write('ws/a.md', bytes('two'));
    expect(text((await store.read('ws/a.md'))!.bytes)).toBe('two');
  });

  it('read/stat return undefined for missing files', async () => {
    expect(await store.read('ws/none.md')).toBeUndefined();
    expect(await store.stat('ws/none.md')).toBeUndefined();
  });

  it('delete and rename honour the not-found contract', async () => {
    await expect(store.delete('ws/none.md')).rejects.toMatchObject({
      code: 'not-found',
    });
    await expect(store.rename('ws/none.md', 'ws/x.md')).rejects.toMatchObject({
      code: 'not-found',
    });

    await store.create('ws/a.md', bytes('data'));
    await store.rename('ws/a.md', 'ws/sub/b.md');
    expect(await store.read('ws/a.md')).toBeUndefined();
    expect(text((await store.read('ws/sub/b.md'))!.bytes)).toBe('data');

    await store.delete('ws/sub/b.md');
    expect(await store.read('ws/sub/b.md')).toBeUndefined();
  });

  it('lists files under a workspace and enumerates workspaces', async () => {
    await store.create('ws/b.md', bytes('1'));
    await store.create('ws/dir/a.md', bytes('2'));
    await store.create('other/c.md', bytes('3'));
    // Dotfiles are ignored.
    await fs.mkdir(path.join(root, 'ws', '.git'), { recursive: true });
    await fs.writeFile(path.join(root, 'ws', '.git', 'HEAD'), 'ref');

    expect(await store.list('ws')).toEqual(['ws/b.md', 'ws/dir/a.md']);
    expect(await store.listWorkspaces()).toEqual(['other', 'ws']);
  });

  it('refuses to escape the storage root', async () => {
    await expect(store.read('ws/../../etc/passwd')).rejects.toMatchObject({
      code: 'invalid-path',
    });
    // A well-formed but symlink-free absolute path is rejected at validation.
    await expect(store.create('/etc/evil', bytes('x'))).rejects.toMatchObject({
      code: 'invalid-path',
    });
  });
});

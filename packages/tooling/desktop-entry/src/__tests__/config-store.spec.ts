import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigStore } from '../config-store';

const TABLE = 'WorkspaceInfo';

function silentLogger() {
  return { info() {}, warn() {}, error() {} };
}

describe('ConfigStore', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'bangle-config-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('round-trips put / get / getAll / delete', async () => {
    const store = new ConfigStore({ dir });

    expect(await store.getEntry('a', TABLE)).toEqual({
      found: false,
      value: undefined,
    });

    await store.putEntry('a', { name: 'a', n: 1 }, TABLE);
    await store.putEntry('b', { name: 'b', n: 2 }, TABLE);

    expect(await store.getEntry('a', TABLE)).toEqual({
      found: true,
      value: { name: 'a', n: 1 },
    });
    expect(await store.getAllEntries(TABLE)).toEqual([
      { name: 'a', n: 1 },
      { name: 'b', n: 2 },
    ]);

    await store.deleteEntry('a', TABLE);

    expect(await store.getEntry('a', TABLE)).toEqual({
      found: false,
      value: undefined,
    });
    expect(await store.getAllEntries(TABLE)).toEqual([{ name: 'b', n: 2 }]);
  });

  it('persists across store instances (reload)', async () => {
    const first = new ConfigStore({ dir });
    await first.putEntry('a', { v: 1 }, TABLE);

    const second = new ConfigStore({ dir });
    expect(await second.getEntry('a', TABLE)).toEqual({
      found: true,
      value: { v: 1 },
    });
  });

  it('writes atomically: valid JSON on disk and no leftover temp file', async () => {
    const store = new ConfigStore({ dir });
    await store.putEntry('a', { v: 1 }, TABLE);

    const filePath = join(dir, `${TABLE}.json`);
    const raw = await readFile(filePath, 'utf8');
    expect(JSON.parse(raw)).toEqual({ a: { v: 1 } });

    await expect(readFile(`${filePath}.tmp`, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('preserves a corrupt file on read and surfaces empty (no clobber)', async () => {
    const filePath = join(dir, `${TABLE}.json`);
    await writeFile(filePath, '{ this is not valid json', 'utf8');

    const store = new ConfigStore({ dir, logger: silentLogger() });

    expect(await store.getEntry('a', TABLE)).toEqual({
      found: false,
      value: undefined,
    });
    expect(await store.getAllEntries(TABLE)).toEqual([]);

    // A failed load must never rewrite the file — the bytes stay intact.
    expect(await readFile(filePath, 'utf8')).toBe('{ this is not valid json');
  });

  it('serializes concurrent writes without losing updates', async () => {
    const store = new ConfigStore({ dir });

    await Promise.all(
      Array.from({ length: 25 }, (_, i) => store.putEntry(`k${i}`, i, TABLE)),
    );

    const all = (await store.getAllEntries(TABLE)) as number[];
    expect([...all].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 25 }, (_, i) => i),
    );

    const raw = await readFile(join(dir, `${TABLE}.json`), 'utf8');
    expect(Object.keys(JSON.parse(raw))).toHaveLength(25);
  });
});

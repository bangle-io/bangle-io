import { readFile } from 'fs/promises';

import { calculateGitFileSha } from '@bangle.io/git-file-sha';
import type { PlainObjEntry } from '@bangle.io/remote-file-sync';

import { openDatabase } from '../database';
import { fileEntryManager } from '../file-entry-manager';

export const readFileBlob = async (filename: string): Promise<File> =>
  new Blob(
    [await readFile(require('path').join(__dirname, `fixtures/${filename}`))],
    { type: 'text/plain' },
  ) as any;

const fileA = readFileBlob('file-a.json');
const fileB = readFileBlob('file-b.md');

const makeEntryForFileA = async (entry: Partial<PlainObjEntry> = {}) => ({
  uid: 'test:file-a.json',
  deleted: undefined,
  file: await fileA,
  sha: await calculateGitFileSha(await fileA),
  source: undefined,
  ...entry,
});

beforeEach(async () => {
  await openDatabase();
});

describe('createFile', () => {
  test('with no source', async () => {
    expect(await fileEntryManager.createEntry(await makeEntryForFileA())).toBe(
      true,
    );

    expect(await fileEntryManager.hasEntry('test:file-a.json')).toBe(true);

    expect(await fileEntryManager.readEntry('test:file-a.json')).toEqual({
      deleted: undefined,
      file: expect.any(Blob),
      sha: '7ad72a87fbfb1d2abd96330d4815c29b8a09ece7',
      source: undefined,
      uid: 'test:file-a.json',
    });
  });

  test('returns false if file already exists', async () => {
    await fileEntryManager.createEntry(await makeEntryForFileA());

    expect(await fileEntryManager.createEntry(await makeEntryForFileA())).toBe(
      false,
    );
  });
});

describe('softDeleteEntry', () => {
  test('soft deletes', async () => {
    const entry = await makeEntryForFileA();
    await fileEntryManager.createEntry(entry);
    expect(await fileEntryManager.softDeleteEntry(entry.uid)).toBe(true);
    expect(await fileEntryManager.readEntry(entry.uid)).toMatchObject({
      deleted: expect.any(Number),
      uid: 'test:file-a.json',
    });
  });

  test('returns false if file doesnt exist', async () => {
    const entry = await makeEntryForFileA();
    expect(await fileEntryManager.softDeleteEntry(entry.uid)).toBe(false);
  });
});

describe('removeEntry', () => {
  test('removes', async () => {
    const entry = await makeEntryForFileA();
    await fileEntryManager.createEntry(entry);
    await fileEntryManager.removeEntry(entry.uid);
    expect(await fileEntryManager.readEntry(entry.uid)).toBe(undefined);
  });

  test('calling multiple times works', async () => {
    const entry = await makeEntryForFileA();
    await fileEntryManager.createEntry(entry);
    await fileEntryManager.removeEntry(entry.uid);
    await fileEntryManager.removeEntry(entry.uid);
    expect(await fileEntryManager.readEntry(entry.uid)).toBe(undefined);
  });
});

describe('listAllEntries & listAllKeys', () => {
  test('works', async () => {
    await Promise.all(
      Array.from({ length: 50 }, async (_, i) => {
        const entry = await makeEntryForFileA({
          uid: `test:file-a-${i}.json`,
        });
        await fileEntryManager.createEntry(entry);
      }),
    );

    expect(await fileEntryManager.listAllEntries('test')).toHaveLength(50);
    expect(await fileEntryManager.listAllKeys('test')).toHaveLength(50);

    expect(await fileEntryManager.listAllEntries('test ')).toHaveLength(0);
    expect(await fileEntryManager.listAllEntries('file')).toHaveLength(0);
    expect(await fileEntryManager.listAllEntries('test:file-')).toHaveLength(0);
  });
});

describe('listSoftDeletedKeys', () => {
  test('works', async () => {
    await Promise.all(
      Array.from({ length: 50 }, async (_, i) => {
        const entry = await makeEntryForFileA({
          uid: `test:file-a-${i}.json`,
        });
        await fileEntryManager.createEntry(entry);

        if (i % 2 === 0) {
          await fileEntryManager.softDeleteEntry(entry.uid);
        }
      }),
    );

    expect(await fileEntryManager.listAllEntries('test')).toHaveLength(50);
    expect(await fileEntryManager.listSoftDeletedKeys('test')).toHaveLength(25);
  });
});

describe('updateSource', () => {
  test('works', async () => {
    const entry = await makeEntryForFileA();
    await fileEntryManager.createEntry(entry);

    expect(await fileEntryManager.updateSource(entry.uid, await fileB)).toBe(
      true,
    );
    expect(await fileEntryManager.readEntry(entry.uid)).toMatchObject({
      source: {
        file: fileB,
        sha: await calculateGitFileSha(await fileB),
      },
    });
  });

  test('providing sha works', async () => {
    const entry = await makeEntryForFileA();
    await fileEntryManager.createEntry(entry);

    expect(
      await fileEntryManager.updateSource(entry.uid, await fileB, 'sha'),
    ).toBe(true);
    expect(await fileEntryManager.readEntry(entry.uid)).toMatchObject({
      source: {
        file: fileB,
        sha: 'sha',
      },
    });
  });
});

describe('updateSourceAndCurrent', () => {
  test('works', async () => {
    const entry = await makeEntryForFileA();
    await fileEntryManager.createEntry(entry);

    expect(
      await fileEntryManager.updateSourceAndCurrent(entry.uid, await fileB),
    ).toBe(true);
    expect(await fileEntryManager.readEntry(entry.uid)).toMatchObject({
      file: fileB,
      sha: await calculateGitFileSha(await fileB),
      source: {
        file: fileB,
        sha: await calculateGitFileSha(await fileB),
      },
    });
  });

  test('providing sha works', async () => {
    const entry = await makeEntryForFileA();
    await fileEntryManager.createEntry(entry);

    expect(
      await fileEntryManager.updateSourceAndCurrent(
        entry.uid,
        await fileB,
        'sha',
      ),
    ).toBe(true);
    expect(await fileEntryManager.readEntry(entry.uid)).toMatchObject({
      file: fileB,
      sha: 'sha',
      source: {
        file: fileB,
        sha: 'sha',
      },
    });
  });
});

describe('resetCurrentToSource and writeFile', () => {
  test('writing works and resetting works', async () => {
    const entry = await makeEntryForFileA({
      source: {
        file: await fileA,
        sha: await calculateGitFileSha(await fileA),
      },
    });
    await fileEntryManager.createEntry(entry);

    expect(await fileEntryManager.readEntry(entry.uid)).toMatchObject({
      file: fileA,
      sha: await calculateGitFileSha(await fileA),
      source: {
        file: fileA,
        sha: await calculateGitFileSha(await fileA),
      },
    });

    // Writing file B should change to file B
    await fileEntryManager.writeFile(entry.uid, await fileB);
    expect(await fileEntryManager.readEntry(entry.uid)).toMatchObject({
      file: fileB,
      sha: await calculateGitFileSha(await fileB),
      source: {
        file: fileA,
        sha: await calculateGitFileSha(await fileA),
      },
    });

    expect(await fileEntryManager.resetCurrentToSource(entry.uid)).toBe(true);
    expect(await fileEntryManager.readEntry(entry.uid)).toMatchObject({
      file: fileA,
      sha: await calculateGitFileSha(await fileA),
      source: {
        file: fileA,
        sha: await calculateGitFileSha(await fileA),
      },
    });
  });

  test('resetCurrentToSource returns false if file not found', async () => {
    expect(
      await fileEntryManager.resetCurrentToSource(
        'test:some-file-that-does-not-exist.md',
      ),
    ).toBe(false);
  });

  test('resetCurrentToSource returns false if source not found', async () => {
    const entry = await makeEntryForFileA({});
    await fileEntryManager.createEntry(entry);

    expect(await fileEntryManager.resetCurrentToSource(entry.uid)).toBe(false);
  });
});

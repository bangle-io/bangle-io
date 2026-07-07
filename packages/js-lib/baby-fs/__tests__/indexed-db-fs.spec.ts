import { isAbortError } from '@bangle.io/mini-js-utils';
import { expect, test, vi } from 'vitest';
import { IndexedDBFileSystem } from '../indexed-db-fs';

const toFile = (str: any) => {
  const file = new File([str], 'foo.txt', { type: 'text/plain' });

  return file;
};

const _serializeMap = (map: any) => {
  return Promise.all(
    [...map.entries()].map(async (r) => [r[0], await r[1]?.text()]),
  );
};

test('writeFile', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  await expect(
    (await fs.readFile('hola/hi'))?.text(),
  ).resolves.toMatchInlineSnapshot(`"my-data"`);

  expect(await fs.stat('hola/hi')).toEqual({
    mtimeMs: expect.any(Number),
  });
});

test('createFile rejects existing files without overwriting', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.createFile('hola/hi', toFile('original'));

  await expect(
    fs.createFile('hola/hi', toFile('replacement')),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[IndexedDBFileSystemError: File "hola/hi" already exists]`,
  );

  await expect(
    (await fs.readFile('hola/hi'))?.text(),
  ).resolves.toMatchInlineSnapshot(`"original"`);
});

test('readFile', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  const data = await fs.readFileAsText('hola/hi');
  expect(data).toMatchInlineSnapshot(`"my-data"`);
});

test('stat', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  const data = await fs.stat('hola/hi');
  expect(data).toEqual({
    mtimeMs: expect.any(Number),
  });
});

test('stat throws error if file not found', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  await expect(
    fs.stat('hola/unknown'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[IndexedDBFileSystemError: File "hola/unknown" not found]`,
  );
});

test('rename', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('mydata'));
  await fs.rename('hola/hi', 'ebola/two');

  await expect(
    fs.readFile('hola/hi'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[IndexedDBFileSystemError: File "hola/hi" not found]`,
  );

  await expect(
    (await fs.readFile('ebola/two'))?.text(),
  ).resolves.toMatchInlineSnapshot(`"mydata"`);
});

test('rename throws error if old file not found', async () => {
  const fs = new IndexedDBFileSystem();

  await expect(
    fs.rename('hola/hi', 'ebola/two'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[IndexedDBFileSystemError: File "hola/hi" not found]`,
  );
});

test('rename throws error if new file already exists', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('mydata'));
  await fs.writeFile('ebola/two', toFile('mydata'));

  await expect(
    fs.rename('hola/hi', 'ebola/two'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[IndexedDBFileSystemError: Cannot rename; File "ebola/two" already exists]`,
  );
});

test('rename keeps the source when the destination write fails', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('mydata'));

  const writeSpy = vi
    .spyOn(fs, 'writeFile')
    .mockRejectedValueOnce(new Error('forced quota failure'));

  await expect(fs.rename('hola/hi', 'ebola/two')).rejects.toThrow(
    'forced quota failure',
  );
  writeSpy.mockRestore();

  await expect((await fs.readFile('hola/hi')).text()).resolves.toBe('mydata');
  await expect(fs.readFile('ebola/two')).rejects.toThrow('not found');
});

test('rename keeps the source when the destination copy is incomplete', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('mydata'));

  const originalWriteFile = fs.writeFile.bind(fs);
  const writeSpy = vi
    .spyOn(fs, 'writeFile')
    .mockImplementation(async (filePath) => {
      // Simulate a partial write: the destination lands truncated.
      await originalWriteFile(filePath, toFile('my'));
    });

  await expect(fs.rename('hola/hi', 'ebola/two')).rejects.toThrow(
    'written incompletely',
  );
  writeSpy.mockRestore();

  await expect((await fs.readFile('hola/hi')).text()).resolves.toBe('mydata');
});

test('rename keeps the source when the destination cannot be read back', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('mydata'));

  const originalReadFile = fs.readFile.bind(fs);
  let destinationReads = 0;
  const readSpy = vi
    .spyOn(fs, 'readFile')
    .mockImplementation(async (filePath) => {
      if (filePath === 'ebola/two') {
        destinationReads += 1;
        // First read is the pre-rename existence check (must report absent);
        // second read is the post-write verification (forced failure).
        if (destinationReads > 1) {
          throw new Error('forced verification read failure');
        }
      }
      return originalReadFile(filePath);
    });

  await expect(fs.rename('hola/hi', 'ebola/two')).rejects.toThrow(
    'could not read back',
  );
  readSpy.mockRestore();

  await expect((await fs.readFile('hola/hi')).text()).resolves.toBe('mydata');
});

test('rename surfaces unlink failures while both copies exist', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('mydata'));

  const unlinkSpy = vi
    .spyOn(fs, 'unlink')
    .mockRejectedValueOnce(new Error('forced unlink failure'));

  await expect(fs.rename('hola/hi', 'ebola/two')).rejects.toThrow(
    'forced unlink failure',
  );
  unlinkSpy.mockRestore();

  // Duplicate copies are the recoverable outcome; no content may be lost.
  await expect((await fs.readFile('hola/hi')).text()).resolves.toBe('mydata');
  await expect((await fs.readFile('ebola/two')).text()).resolves.toBe('mydata');
});

test('unlink', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));
  await fs.unlink('hola/hi');
  await expect(
    fs.readFile('hola/hi'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[IndexedDBFileSystemError: File "hola/hi" not found]`,
  );
});

test('opendirRecursive root', async () => {
  const fs = new IndexedDBFileSystem();

  await fs.writeFile('hola/hi', toFile('my-data'));
  await fs.writeFile('hola/bye', toFile('my-data'));
  const result = await fs.opendirRecursive('hola');
  expect(result.sort()).toEqual(['hola/bye', 'hola/hi']);
});

test('opendirRecursive subdir', async () => {
  const fs = new IndexedDBFileSystem();

  await fs.writeFile('hola/hi', toFile('my-data'));
  await fs.writeFile('hola/bye', toFile('my-data'));
  await fs.writeFile('holamagic/bye', toFile('my-data'));
  await fs.writeFile('jango/bye', toFile('my-data'));
  let result = await fs.opendirRecursive('jango/');
  expect(result).toMatchInlineSnapshot(`
    [
      "jango/bye",
    ]
  `);

  result = await fs.opendirRecursive('hola');
  expect(result.sort()).toEqual(['hola/bye', 'hola/hi']);

  result = await fs.opendirRecursive('holamagic');
  expect(result).toMatchInlineSnapshot(`
    [
      "holamagic/bye",
    ]
  `);
});

test('opendirRecursive rejects with a recognizable abort error when already aborted', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  const abortController = new AbortController();
  abortController.abort();

  const error = await fs
    .opendirRecursive('hola', abortController.signal)
    .catch((e: unknown) => e);

  expect(isAbortError(error)).toBe(true);
});

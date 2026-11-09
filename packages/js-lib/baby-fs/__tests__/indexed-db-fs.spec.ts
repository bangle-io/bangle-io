import { isAbortError } from '@bangle.io/mini-js-utils';
import { expect, test, vi } from 'vitest';
import {
  FILE_ALREADY_EXISTS_ERROR,
  FILE_NOT_FOUND_ERROR,
  UPSTREAM_ERROR,
} from '../error-codes';
import {
  IndexedDBFileSystem,
  IndexedDBFileSystemError,
} from '../indexed-db-fs';

const toFile = (str: string) => {
  const file = new File([str], 'foo.txt', { type: 'text/plain' });

  return file;
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

  const error = await fs
    .createFile('hola/hi', toFile('replacement'))
    .catch((cause: unknown) => cause);

  expect(error).toBeInstanceOf(IndexedDBFileSystemError);
  expect(error).toMatchObject({
    code: FILE_ALREADY_EXISTS_ERROR,
    cause: expect.objectContaining({ name: 'ConstraintError' }),
  });
  expect(error).toMatchInlineSnapshot(
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

test('readFile preserves the upstream IndexedDB failure as its cause', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  const cause = new Error('forced IndexedDB failure');
  const transactionSpy = vi
    .spyOn(IDBDatabase.prototype, 'transaction')
    .mockImplementationOnce(() => {
      throw cause;
    });

  try {
    const error = await fs
      .readFile('hola/hi')
      .catch((readError: unknown) => readError);

    expect(error).toBeInstanceOf(IndexedDBFileSystemError);
    expect(error).toMatchObject({ code: UPSTREAM_ERROR, cause });
  } finally {
    transactionSpy.mockRestore();
  }
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

test('writeExistingFile rejects a missing file without creating it', async () => {
  const fs = new IndexedDBFileSystem();

  await expect(
    fs.writeExistingFile('write-existing/missing', toFile('new data')),
  ).rejects.toThrow('File "write-existing/missing" not found');
  await expect(fs.readFile('write-existing/missing')).rejects.toThrow(
    'not found',
  );
});

test('rename serializes with an update without losing acknowledged content', async () => {
  const fs = new IndexedDBFileSystem();
  const oldPath = 'rename-update/old';
  const newPath = 'rename-update/new';
  await fs.createFile(oldPath, toFile('old data'));

  const [renameResult, updateResult] = await Promise.allSettled([
    fs.rename(oldPath, newPath),
    fs.writeExistingFile(oldPath, toFile('latest data')),
  ]);

  expect(renameResult.status).toBe('fulfilled');
  if (updateResult.status === 'fulfilled') {
    await expect((await fs.readFile(newPath)).text()).resolves.toBe(
      'latest data',
    );
  } else {
    expect(updateResult.reason).toMatchObject({ code: FILE_NOT_FOUND_ERROR });
    await expect((await fs.readFile(newPath)).text()).resolves.toBe('old data');
  }
  await expect(fs.readFile(oldPath)).rejects.toThrow('not found');
});

test('rename serializes with destination creation without overwriting it', async () => {
  const fs = new IndexedDBFileSystem();
  const oldPath = 'rename-create/old';
  const newPath = 'rename-create/new';
  await fs.createFile(oldPath, toFile('source data'));

  const [renameResult, createResult] = await Promise.allSettled([
    fs.rename(oldPath, newPath),
    fs.createFile(newPath, toFile('created data')),
  ]);

  expect(
    [renameResult, createResult].filter(({ status }) => status === 'fulfilled'),
  ).toHaveLength(1);
  if (renameResult.status === 'fulfilled') {
    expect(createResult).toMatchObject({
      status: 'rejected',
      reason: { code: FILE_ALREADY_EXISTS_ERROR },
    });
    await expect((await fs.readFile(newPath)).text()).resolves.toBe(
      'source data',
    );
    await expect(fs.readFile(oldPath)).rejects.toThrow('not found');
  } else {
    expect(renameResult.reason).toMatchObject({
      code: FILE_ALREADY_EXISTS_ERROR,
    });
    await expect((await fs.readFile(newPath)).text()).resolves.toBe(
      'created data',
    );
    await expect((await fs.readFile(oldPath)).text()).resolves.toBe(
      'source data',
    );
  }
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

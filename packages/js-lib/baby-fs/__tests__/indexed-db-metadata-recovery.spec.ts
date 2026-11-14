import { expect, test, vi } from 'vitest';
import { FILE_NOT_FOUND_ERROR } from '../error-codes';
import { IndexedDBFileSystem } from '../indexed-db-fs';

const CONTENT_DB = 'baby-idb-db-3';
const METADATA_DB = 'baby-idb-meta-3';
const SOURCE_PATH = 'metadata-recovery/source.md';
const DESTINATION_PATH = 'metadata-recovery/destination.md';

function failTransactions(databaseName: string, mode?: IDBTransactionMode) {
  const cause = new DOMException(
    'Injected database failure',
    'QuotaExceededError',
  );
  const transaction = IDBDatabase.prototype.transaction;
  vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(function (
    this: IDBDatabase,
    storeNames,
    transactionMode,
    options,
  ) {
    if (
      this.name === databaseName &&
      transactionMode !== 'versionchange' &&
      (mode === undefined || transactionMode === mode)
    ) {
      throw cause;
    }
    return transaction.call(this, storeNames, transactionMode, options);
  });
  return cause;
}

function file(content: string) {
  return new File([content], 'source.md', { lastModified: 1234 });
}

const mutations = [
  'create',
  'write',
  'writeExisting',
  'rename',
  'delete',
] as const;
type Mutation = (typeof mutations)[number];

async function mutate(fs: IndexedDBFileSystem, mutation: Mutation) {
  switch (mutation) {
    case 'create':
      return fs.createFile(DESTINATION_PATH, file('new content'));
    case 'write':
      return fs.writeFile(SOURCE_PATH, file('new content'));
    case 'writeExisting':
      return fs.writeExistingFile(SOURCE_PATH, file('new content'));
    case 'rename':
      return fs.rename(SOURCE_PATH, DESTINATION_PATH);
    case 'delete':
      return fs.unlink(SOURCE_PATH);
  }
}

test.each(mutations)(
  '%s reports the committed content mutation when metadata writes fail',
  async (mutation) => {
    const fs = new IndexedDBFileSystem();
    await fs.createFile(SOURCE_PATH, file('original content'));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cause = failTransactions(METADATA_DB, 'readwrite');

    await expect(mutate(fs, mutation)).resolves.toBeUndefined();

    const paths = await fs.opendirRecursive('metadata-recovery');
    if (mutation === 'rename' || mutation === 'delete') {
      expect(paths).not.toContain(SOURCE_PATH);
    } else {
      expect(await fs.readFileAsText(SOURCE_PATH)).toBe(
        mutation === 'create' ? 'original content' : 'new content',
      );
    }
    if (mutation === 'create' || mutation === 'rename') {
      expect(await fs.readFileAsText(DESTINATION_PATH)).toBe(
        mutation === 'create' ? 'new content' : 'original content',
      );
    }
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('file contents are unaffected'),
      cause,
    );
  },
);

test.each(mutations)(
  '%s still rejects a content database failure and preserves existing content',
  async (mutation) => {
    const fs = new IndexedDBFileSystem();
    await fs.createFile(SOURCE_PATH, file('original content'));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    failTransactions(CONTENT_DB, 'readwrite');

    await expect(mutate(fs, mutation)).rejects.toThrow();
    expect(await fs.readFileAsText(SOURCE_PATH)).toBe('original content');
    expect(await fs.opendirRecursive('metadata-recovery')).toEqual([
      SOURCE_PATH,
    ]);
    expect(warning).not.toHaveBeenCalled();
  },
);

test('stat falls back when metadata cannot be read, while a missing file still rejects', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.createFile(SOURCE_PATH, file('original content'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  failTransactions(METADATA_DB, 'readonly');

  expect(await fs.stat(SOURCE_PATH)).toEqual({ mtimeMs: expect.any(Number) });
  await expect(fs.stat('metadata-recovery/missing.md')).rejects.toMatchObject({
    code: FILE_NOT_FOUND_ERROR,
  });
});

test('stat returns a fallback timestamp if its missing metadata cannot be written', async () => {
  const fs = new IndexedDBFileSystem();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const cause = failTransactions(METADATA_DB, 'readwrite');
  await fs.createFile(SOURCE_PATH, file('original content'));

  expect(await fs.stat(SOURCE_PATH)).toEqual({ mtimeMs: expect.any(Number) });
  expect(console.warn).toHaveBeenCalledWith(expect.any(String), cause);
});

test('stat never hides content database read errors behind a fallback', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.createFile(SOURCE_PATH, file('original content'));
  const cause = failTransactions(CONTENT_DB, 'readonly');

  await expect(fs.stat(SOURCE_PATH)).rejects.toMatchObject({ cause });
});

test('missing metadata is repaired once the metadata database recovers', async () => {
  const fs = new IndexedDBFileSystem();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  failTransactions(METADATA_DB);
  await fs.createFile(SOURCE_PATH, file('original content'));
  await expect(fs.stat(SOURCE_PATH)).resolves.toBeDefined();
  vi.restoreAllMocks();

  const recovered = await fs.stat(SOURCE_PATH);
  expect(await new IndexedDBFileSystem().stat(SOURCE_PATH)).toEqual(recovered);
  expect(await fs.readFileAsText(SOURCE_PATH)).toBe('original content');
});

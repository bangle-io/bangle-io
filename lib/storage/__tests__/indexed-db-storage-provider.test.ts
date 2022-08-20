/**
 * @jest-environment @bangle.io/jsdom-env
 */

import type { StorageOpts } from '../base-storage';
import { IndexedDbStorageProvider } from '../indexed-db-storage-provider';

let idbProvider = new IndexedDbStorageProvider();

const opts: StorageOpts = {
  specRegistry: {} as any,
  readWorkspaceMetadata: jest.fn(),
  updateWorkspaceMetadata: jest.fn(),
};

beforeEach(() => {
  idbProvider = new IndexedDbStorageProvider();
});

describe('fileExists', () => {
  test('file not found', async () => {
    await expect(idbProvider.fileExists('test:hello.md', opts)).resolves.toBe(
      false,
    );
  });
});

describe('listAllFiles', () => {
  test('empty', async () => {
    await expect(
      idbProvider.listAllFiles(new AbortController().signal, 'test', opts),
    ).resolves.toEqual([]);
  });
});

describe('saveFile / readFile', () => {
  test('file not found', async () => {
    await expect(
      idbProvider.readFile('hello:one.md', opts),
    ).resolves.toBeUndefined();
  });

  test('works', async () => {
    const file = new File(['hello I am a test file'], 'one.file');
    const wsPath = 'test:one.file';

    await idbProvider.writeFile(wsPath, file, opts);
    expect(await idbProvider.readFile(wsPath, opts)).toEqual(file);

    expect(await idbProvider.fileExists(wsPath, opts)).toBe(true);

    await expect(
      idbProvider.listAllFiles(new AbortController().signal, 'test', opts),
    ).resolves.toEqual([wsPath]);
  });
});

describe('rename', () => {
  test('works', async () => {
    const file = new File(['hello I am a test file'], 'one.file');
    const wsPath = 'test:one.file';

    await idbProvider.writeFile(wsPath, file, opts);
    expect(await idbProvider.readFile(wsPath, opts)).toEqual(file);

    await idbProvider.renameFile(wsPath, 'test:one-renamed.md', opts);

    expect(await idbProvider.readFile('test:one-renamed.md', opts)).toEqual(
      file,
    );
    expect(await idbProvider.fileExists('test:one.md', opts)).toBe(false);
  });
});

describe('fileStat', () => {
  test('works', async () => {
    const file = new File(['hello I am a test file'], 'one.file');
    const wsPath = 'test:one.file';

    await idbProvider.writeFile(wsPath, file, opts);

    expect(await idbProvider.fileStat(wsPath, opts)).toEqual({
      ctime: expect.any(Number),
      mtime: expect.any(Number),
    });
  });
});

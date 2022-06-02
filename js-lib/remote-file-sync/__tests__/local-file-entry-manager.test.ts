/**
 * @jest-environment jsdom
 */

import { RemoteFileEntry } from '..';
import {
  BaseFileEntry,
  LocalFileEntry,
  LocalFileEntryManager,
} from '../local-file-entry-manager';
import { readFileBlob } from './test-helpers';

const createManager = () => {
  const store = new Map<string, any>();
  const manager = new LocalFileEntryManager({
    get: (key: string) => Promise.resolve(store.get(key)),
    set: (key: string, obj: any) => {
      store.set(key, obj);

      return Promise.resolve();
    },
    getValues: (keyPrefix: string) =>
      Promise.resolve(Array.from(store.values())),
    delete: (key: string) => {
      store.delete(key);

      return Promise.resolve();
    },
  });

  return { manager, store };
};

describe('LocalFileEntryManager', () => {
  describe('createFile', () => {
    test('with no source', async () => {
      const { manager, store } = createManager();
      const file = await readFileBlob('file-a.json');
      await manager.createFile('foo', file, async () => undefined);

      expect(store.get('foo')).toEqual({
        deleted: undefined,
        file: expect.any(Blob),
        sha: '7ad72a87fbfb1d2abd96330d4815c29b8a09ece7',
        source: undefined,
        uid: 'foo',
      });

      expect(await manager.readFile('foo', async () => undefined)).toBe(file);
    });

    test('throws if file exists locally', async () => {
      const { manager, store } = createManager();
      const file = await readFileBlob('file-a.json');
      await manager.createFile('foo', file, async () => undefined);

      const prom = manager.createFile('foo', file, async () => undefined);

      await expect(prom).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot create as file already exists"`,
      );

      expect(store.get('foo')).toEqual({
        deleted: undefined,
        file: expect.any(Blob),
        sha: '7ad72a87fbfb1d2abd96330d4815c29b8a09ece7',
        source: undefined,
        uid: 'foo',
      });

      expect(await manager.readFile('foo', async () => undefined)).toBe(file);
    });

    test('throws error if remote has the file', async () => {
      const { manager, store } = createManager();
      const file = await readFileBlob('file-a.json');

      const remoteFile = await readFileBlob('file-e.md');
      const prom = manager.createFile('foo', file, async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile,
          uid,
          deleted: undefined,
        });
      });

      await expect(prom).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot create as file already exists"`,
      );
      expect(store.size).toBe(1);

      // still updates the local entry for file
      expect(store.get('foo')).toEqual({
        deleted: undefined,
        file: remoteFile,
        sha: '0339c1e590ea445ae79aa43ed435b34ffb8286c8',
        source: {
          file: remoteFile,
          sha: '0339c1e590ea445ae79aa43ed435b34ffb8286c8',
        },
        uid: 'foo',
      });

      expect(await manager.readFile('foo', async () => undefined)).toBe(
        remoteFile,
      );
    });

    test('works if source file is deleted', async () => {
      const { manager, store } = createManager();
      const file = await readFileBlob('file-a.json');

      const remoteFile = await readFileBlob('file-e.md');
      await manager.createFile('foo', file, async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile,
          uid,
          deleted: 3434,
        });
      });

      expect(await manager.readFile('foo', async () => undefined)).toBe(file);
    });
  });

  describe('deleteFile', () => {
    test('on non existent file', async () => {
      const { manager, store } = createManager();
      await manager.deleteFile('foo');
      expect(store.size).toBe(0);
    });

    test('on local file with no remote entry', async () => {
      const { manager, store } = createManager();
      const file = await readFileBlob('file-a.json');
      await manager.createFile('foo', file, async () => undefined);

      expect(await manager.listFiles([])).toEqual(['foo']);

      await manager.deleteFile('foo');

      expect(await manager.listFiles([])).toEqual([]);

      expect(store.size).toBe(1);
      expect(store.get('foo')).toEqual({
        deleted: expect.any(Number),
        file: expect.any(Blob),
        sha: '7ad72a87fbfb1d2abd96330d4815c29b8a09ece7',
        source: undefined,
        uid: 'foo',
      });

      expect(await manager.readFile('foo', async () => undefined)).toBe(
        undefined,
      );
    });

    test('calling multiple time', async () => {
      const { manager, store } = createManager();
      const file = await readFileBlob('file-a.json');
      await manager.createFile('foo', file, async () => undefined);
      await manager.deleteFile('foo');

      await manager.deleteFile('foo');

      expect(await manager.readFile('foo', async () => undefined)).toBe(
        undefined,
      );
    });

    test('deleting an unmodified file', async () => {
      const { manager, store } = createManager();
      const remoteFile = await readFileBlob('file-e.md');

      await manager.readFile('foo', async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile,
          uid,
          deleted: undefined,
        });
      });
      await manager.deleteFile('foo');

      expect(store.get('foo')).toEqual({
        deleted: expect.any(Number),
        file: expect.any(Blob),
        sha: '0339c1e590ea445ae79aa43ed435b34ffb8286c8',
        source: {
          file: remoteFile,
          sha: '0339c1e590ea445ae79aa43ed435b34ffb8286c8',
        },
        uid: 'foo',
      });
    });
    test('with remote entry', async () => {
      const { manager, store } = createManager();

      const remoteFile = await readFileBlob('file-e.md');
      await manager.deleteFile('foo', async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile,
          uid,
          deleted: undefined,
        });
      });

      expect(await manager.readFile('foo', async () => undefined)).toBe(
        undefined,
      );

      expect(store.get('foo')).toEqual({
        deleted: expect.any(Number),
        file: expect.any(Blob),
        sha: '0339c1e590ea445ae79aa43ed435b34ffb8286c8',
        source: {
          file: remoteFile,
          sha: '0339c1e590ea445ae79aa43ed435b34ffb8286c8',
        },
        uid: 'foo',
      });
    });
  });

  describe('readFile', () => {
    test('reads a file first time with remote undefined', async () => {
      const { manager, store } = createManager();

      const result = await manager.readFile('foo', async (uid) => {
        return undefined;
      });

      expect(result).toBeUndefined();
    });
    test('reads a file first time with remote defined', async () => {
      const { manager, store } = createManager();

      const remoteFile = await readFileBlob('file-e.md');
      const file = await manager.readFile('foo', async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile,
          uid,
          deleted: undefined,
        });
      });
      expect(file).toBe(remoteFile);
      expect(store.get('foo')).toEqual({
        deleted: undefined,
        file: remoteFile,
        sha: '0339c1e590ea445ae79aa43ed435b34ffb8286c8',
        source: {
          file: remoteFile,
          sha: '0339c1e590ea445ae79aa43ed435b34ffb8286c8',
        },
        uid: 'foo',
      });
    });

    test('does not update an unmodified file if remote file has changed', async () => {
      const { manager, store } = createManager();

      const remoteFile1 = await readFileBlob('file-b.md');
      const remoteFile2 = await readFileBlob('file-e.md');

      const file1 = await manager.readFile('foo', async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile1,
          uid,
          deleted: undefined,
        });
      });
      // first set the file in store
      expect(file1).toBe(remoteFile1);

      const file2 = await manager.readFile('foo', async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile2,
          uid,
          deleted: undefined,
        });
      });

      expect(file2).toBe(remoteFile1);
      expect(file2).not.toBe(remoteFile2);
    });

    test('ignore remote file is local is modified', async () => {
      const { manager, store } = createManager();

      const remoteFile1 = await readFileBlob('file-b.md');
      const remoteFile2 = await readFileBlob('file-e.md');

      await manager.readFile('foo', async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile1,
          uid,
          deleted: undefined,
        });
      });

      const writtenFile = await readFileBlob('file-a.json');

      await manager.writeFile('foo', writtenFile);

      expect(
        await manager.readFile('foo', async (uid) => {
          return RemoteFileEntry.newFile({
            file: remoteFile1,
            uid,
            deleted: undefined,
          });
        }),
      ).toBe(writtenFile);

      expect(
        await manager.readFile('foo', async (uid) => {
          return RemoteFileEntry.newFile({
            file: remoteFile2,
            uid,
            deleted: undefined,
          });
        }),
      ).toBe(writtenFile);

      expect(
        await manager.readFile('foo', async (uid) => {
          return RemoteFileEntry.newFile({
            file: remoteFile1,
            uid,
            deleted: 23231,
          });
        }),
      ).toBe(writtenFile);
    });

    test('throws error if file does not exist', async () => {
      const { manager, store } = createManager();
      const writtenFile = await readFileBlob('file-a.json');

      await expect(
        manager.writeFile('foo', writtenFile),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot write as file does not exist"`,
      );
    });

    test('throws error if file was just deleted', async () => {
      const { manager, store } = createManager();
      const writtenFile = await readFileBlob('file-a.json');
      await manager.createFile('foo', writtenFile, async () => undefined);
      await manager.deleteFile('foo');

      await expect(
        manager.writeFile('foo', writtenFile),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot write as file is deleted"`,
      );
    });
  });

  describe('listFiles', () => {
    // any unmodified file should be ignored and defaulted to
    // remote as source of truth
    test('ignores unmodified local files', async () => {
      const { manager, store } = createManager();

      const remoteFile1 = await readFileBlob('file-b.md');
      const remoteFile2 = await readFileBlob('file-e.md');

      await manager.readFile('foo', async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile1,
          uid,
          deleted: undefined,
        });
      });

      await manager.readFile('bar', async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile2,
          uid,
          deleted: undefined,
        });
      });

      const files = await manager.listFiles([]);

      expect(files).toEqual([]);
    });

    test('accounts for deleted local files', async () => {
      const { manager, store } = createManager();

      const remoteFile1 = await readFileBlob('file-b.md');

      await manager.readFile('foo', async (uid) => {
        return RemoteFileEntry.newFile({
          file: remoteFile1,
          uid,
          deleted: undefined,
        });
      });

      expect(await manager.listFiles(['foo', 'bar'])).toEqual(['bar', 'foo']);

      await manager.deleteFile('foo');

      expect(await manager.listFiles(['foo', 'bar'])).toEqual(['bar']);
    });

    test('accounts for newly created local files', async () => {
      const { manager, store } = createManager();

      await manager.createFile(
        'foo',
        await readFileBlob('file-b.md'),
        async (uid) => {
          return undefined;
        },
      );

      expect(await manager.listFiles(['zoo', 'bar'])).toEqual([
        'bar',
        'foo',
        'zoo',
      ]);
    });
  });
});

describe('BaseFileEntry', () => {
  test('toPlainObj', async () => {
    const file = await readFileBlob('file-b.md');

    expect(
      new BaseFileEntry({
        uid: 'foo',
        sha: 'sdasda',
        file: file,
        deleted: undefined,
      }).toPlainObj(),
    ).toEqual({
      uid: 'foo',
      sha: 'sdasda',
      file: file,
      deleted: undefined,
    });

    expect(
      BaseFileEntry.fromPlainObj({
        uid: 'foo',
        sha: 'sdasda',
        file: file,
        deleted: undefined,
      }).toPlainObj(),
    ).toEqual({ uid: 'foo', sha: 'sdasda', file: file, deleted: undefined });
  });
});

describe('LocalFileEntry', () => {
  test('toPlainObj', async () => {
    const file = await readFileBlob('file-b.md');

    expect(
      new LocalFileEntry({
        uid: 'foo',
        sha: 'sdasda',
        file: file,
        deleted: undefined,
        source: undefined,
      }).toPlainObj(),
    ).toEqual({
      uid: 'foo',
      sha: 'sdasda',
      file: file,
      deleted: undefined,
      source: undefined,
    });

    expect(
      LocalFileEntry.fromPlainObj({
        uid: 'foo',
        sha: 'sdasda',
        file: file,
        deleted: undefined,
        source: undefined,
      }).toPlainObj(),
    ).toEqual({
      uid: 'foo',
      sha: 'sdasda',
      file: file,
      deleted: undefined,
      source: undefined,
    });
  });

  test('newFile', async () => {
    const file = await readFileBlob('file-b.md');

    const res = await LocalFileEntry.newFile({
      uid: 'foo',
      file: file,
    });

    // has source undefined
    expect(res.toPlainObj()).toEqual({
      uid: 'foo',
      sha: 'd7fc7b493f69db5cf1900630cd991f1dbc792af5',
      file: file,
      deleted: undefined,
      source: undefined,
    });

    expect(res.isModified).toBe(true);
    expect(res.isNew).toBe(true);
  });

  test('markDeleted', async () => {
    const file = await readFileBlob('file-b.md');

    const res = await LocalFileEntry.newFile({
      uid: 'foo',
      file: file,
    });

    const deletedRes = res.markDeleted();

    expect(deletedRes).not.toBe(res);

    expect(deletedRes).toEqual({
      uid: 'foo',
      sha: 'd7fc7b493f69db5cf1900630cd991f1dbc792af5',
      file: file,
      deleted: expect.any(Number),
      source: undefined,
    });
  });

  test('updateFile with same instance', async () => {
    const file = await readFileBlob('file-b.md');

    const res = await LocalFileEntry.newFile({
      uid: 'foo',
      file: file,
    });

    const updatedRes = await res.updateFile(file);

    expect(updatedRes).toBe(res);
  });

  test('updateFile with same file sha', async () => {
    const file1 = await readFileBlob('file-b.md');
    const file2 = await readFileBlob('file-b.md');

    const res = await LocalFileEntry.newFile({
      uid: 'foo',
      file: file1,
    });

    const updatedRes = await res.updateFile(file2);

    expect(updatedRes).toBe(res);
  });

  test('updateFile with same file sha but deleted', async () => {
    const file1 = await readFileBlob('file-b.md');
    const file2 = await readFileBlob('file-b.md');

    const res = await LocalFileEntry.newFile({
      uid: 'foo',
      file: file1,
    });

    const updatedRes = await res.markDeleted().updateFile(file2);

    // unset the delete
    expect(updatedRes).not.toBe(res);

    expect(updatedRes.toPlainObj()).toEqual(res.toPlainObj());
  });

  test('updateFile on new file with different file sha', async () => {
    const file1 = await readFileBlob('file-b.md');
    const file2 = await readFileBlob('file-e.md');

    const res = await LocalFileEntry.newFile({
      uid: 'foo',
      file: file1,
    });

    const updatedRes = await res.updateFile(file2);

    expect(updatedRes).not.toBe(res);

    expect(updatedRes.isNew).toBe(true);
    expect(updatedRes.isModified).toBe(true);
    expect(updatedRes.toPlainObj()).toEqual({
      uid: 'foo',
      sha: '0339c1e590ea445ae79aa43ed435b34ffb8286c8',
      file: file2,
      deleted: undefined,
      source: undefined,
    });
  });

  test('updateFile unsets delete', async () => {
    const file1 = await readFileBlob('file-b.md');
    const file2 = await readFileBlob('file-e.md');

    const res = await RemoteFileEntry.newFile({
      uid: 'foo',
      file: file1,
      deleted: undefined,
    });

    const localFileFork = (await res.forkLocalFileEntry()).markDeleted();

    expect(localFileFork.deleted).toEqual(expect.any(Number));

    const localFileFork2 = await localFileFork.updateFile(file2);

    expect(localFileFork2.deleted).toBe(undefined);
  });

  test('updateFile on remote fork', async () => {
    const file1 = await readFileBlob('file-b.md');
    const file2 = await readFileBlob('file-e.md');

    const res = await RemoteFileEntry.newFile({
      uid: 'foo',
      file: file1,
      deleted: undefined,
    });

    const localFileFork = await res.forkLocalFileEntry();

    expect(localFileFork.isModified).toBe(false);
    expect(localFileFork.isNew).toBe(false);

    expect(localFileFork.toPlainObj()).toEqual({
      uid: 'foo',
      sha: 'd7fc7b493f69db5cf1900630cd991f1dbc792af5',
      file: file1,
      deleted: undefined,
      source: {
        file: file1,
        sha: 'd7fc7b493f69db5cf1900630cd991f1dbc792af5',
      },
    });

    const localFileFork2 = await localFileFork.updateFile(file2);

    expect(localFileFork2.isModified).toBe(true);
    expect(localFileFork2.isNew).toBe(false);

    expect(localFileFork2.toPlainObj()).toEqual({
      uid: 'foo',
      sha: '0339c1e590ea445ae79aa43ed435b34ffb8286c8',
      file: file2,
      deleted: undefined,
      source: {
        file: file1,
        sha: 'd7fc7b493f69db5cf1900630cd991f1dbc792af5',
      },
    });
  });
});

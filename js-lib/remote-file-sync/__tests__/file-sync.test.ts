import type { SyncFileEntry } from '../file-sync';
import { fileSync } from '../file-sync';

class File {
  constructor(public content: any, public fileName: any, public opts: any) {}
}

const createFile = (name = 'google.png') =>
  new File('I am the content of image', name, {}) as any;

const createFileEntry = (
  fileEntry: Partial<SyncFileEntry> = {},
): SyncFileEntry => ({
  file: createFile(),
  uid: 'test:one.md',
  deleted: undefined,
  sha: '3edsds',
  ...fileEntry,
});

describe('File states', () => {
  test('Case A works when files are same', async () => {
    const result = fileSync(
      createFileEntry({ sha: '123sha' }),
      createFileEntry({ sha: '123sha' }),
    );

    expect(result).toBeUndefined();
  });

  test('Case B works when both files are undefined', async () => {
    const result = fileSync();
    expect(result).toBeUndefined();
  });

  test('Case C works when file B is undefined but file A is defined', async () => {
    const result = fileSync(createFileEntry({ sha: '123sha' }));

    expect(result).toEqual({
      action: 'set',
      file: expect.any(File),
      target: 'fileB',
    });
  });

  test('Case C works when file A is undefined but file A is defined', async () => {
    const result = fileSync(undefined, createFileEntry({ sha: '123sha' }));

    expect(result).toEqual({
      action: 'set',
      file: expect.any(File),
      target: 'fileA',
    });
  });

  test('Case C works when file A is undefined but file B is deleted', async () => {
    const result = fileSync(
      undefined,
      createFileEntry({ sha: '123sha', deleted: 12 }),
    );

    expect(result).toEqual(undefined);
  });

  test('Case C works when file B is undefined but file A is deleted', async () => {
    const result = fileSync(createFileEntry({ sha: '123sha', deleted: 12 }));

    expect(result).toEqual(undefined);
  });

  describe('Case D both are defined', () => {
    test('Case D: Misc when sha is same, one is deleted and source is not defined', async () => {
      let result = fileSync(
        createFileEntry({ sha: '123sha', deleted: 1 }),
        createFileEntry({ sha: '123sha' }),
      );

      expect(result).toEqual({
        action: 'conflict',
      });

      result = fileSync(
        createFileEntry({ sha: '123sha' }),
        createFileEntry({ sha: '123sha', deleted: 1 }),
      );

      expect(result).toEqual({
        action: 'conflict',
      });
    });

    test('Case D: Misc when sha is same but file A is deleted', async () => {
      const result = fileSync(
        createFileEntry({ sha: '123sha', deleted: 1 }),
        createFileEntry({ sha: '123sha' }),
        createFileEntry({ sha: '123sha' }),
      );

      expect(result).toEqual({
        action: 'delete',
        target: 'fileB',
      });
    });

    test('Case D: Misc when sha is same but file B is deleted', async () => {
      const result = fileSync(
        createFileEntry({ sha: '123sha' }),
        createFileEntry({ sha: '123sha', deleted: 1 }),
        createFileEntry({ sha: '123sha' }),
      );

      expect(result).toEqual({
        action: 'delete',
        target: 'fileA',
      });
    });

    test('Case D: Misc when sha is different and one of the file is deleted', async () => {
      let result = fileSync(
        createFileEntry({ sha: 'abcsha' }),
        createFileEntry({ sha: '123sha', deleted: 1 }),
        createFileEntry({ sha: '123sha' }),
      );

      // it should overwrite the deletion of fileB
      expect(result).toEqual({
        action: 'set',
        file: expect.any(File),
        target: 'fileB',
      });

      // fileA was modified and also deleted
      result = fileSync(
        createFileEntry({ sha: 'abcsha', deleted: 1 }),
        createFileEntry({ sha: '123sha' }),
        createFileEntry({ sha: '123sha' }),
      );

      // it should delete fileB
      expect(result).toEqual({
        action: 'delete',
        target: 'fileB',
      });
    });

    test('Case D.2 throws error if ancestor file is not defined', async () => {
      const result = fileSync(
        createFileEntry({ sha: 'abc' }),
        createFileEntry({ sha: 'def' }),
      );

      await expect(result).toEqual({ action: 'conflict' });
    });

    test('Case D.1.1 no change', async () => {
      // Note we might not cover all the D.1.1 code
      //  as we check for this early in Case A
      const result = fileSync(
        createFileEntry({ sha: 'abc' }),
        createFileEntry({ sha: 'abc' }),
      );

      await expect(result).toBeUndefined();
    });

    test('Case D.1.2 A:no change, B:modified', async () => {
      const result = fileSync(
        createFileEntry({ sha: 'abc' }),
        createFileEntry({ sha: 'bcd', file: createFile('file-a') }),
        createFileEntry({ sha: 'abc' }),
      );

      await expect(result).toEqual({
        action: 'set',
        file: {
          content: 'I am the content of image',
          fileName: 'file-a',
          opts: {},
        },
        target: 'fileA',
      });
    });

    test('ancestor file entry isDeleted', () => {
      const result = fileSync(
        createFileEntry({ sha: '123sha' }),
        createFileEntry({ sha: '123sha' }),
        createFileEntry({ sha: '123sha', deleted: 1 }),
      );

      expect(result).toEqual(undefined);
    });

    test('Case D.1.3 A:no change, B:deleted', async () => {
      const result = fileSync(
        createFileEntry({ sha: 'abc' }),
        createFileEntry({ sha: 'bcd', deleted: 12 }),
        createFileEntry({ sha: 'abc' }),
      );

      await expect(result).toEqual({
        action: 'delete',
        target: 'fileA',
      });
    });

    test('Case D.1.4 A:modified, B:no change', async () => {
      const fileEntryA = createFileEntry({
        sha: 'def',
        file: createFile('file-a'),
      });
      const fileEntryB = createFileEntry({
        sha: 'abc',
        file: createFile('file-b'),
      });
      const result = fileSync(
        fileEntryA,
        fileEntryB,
        createFileEntry({ sha: 'abc' }),
      );

      await expect(result).toEqual({
        action: 'set',
        file: {
          content: 'I am the content of image',
          fileName: 'file-a',
          opts: {},
        },
        target: 'fileB',
      });
    });

    test('Case D.1.5 conflict if both modified', async () => {
      const result = fileSync(
        createFileEntry({ sha: 'abc' }),
        createFileEntry({ sha: 'def' }),
        createFileEntry({ sha: 'xyz' }),
      );

      await expect(result).toEqual({ action: 'conflict' });
    });

    test('Case D.1.6 A:modified, B:deleted; should target b', async () => {
      const result = fileSync(
        createFileEntry({ sha: 'abc', file: createFile('file-a') }),
        createFileEntry({ sha: 'def', deleted: 12 }),
        createFileEntry({ sha: 'xyz' }),
      );

      await expect(result).toEqual({
        action: 'set',
        file: {
          content: 'I am the content of image',
          fileName: 'file-a',
          opts: {},
        },
        target: 'fileB',
      });
    });

    test('Case D.1.7 A:deleted, B:no change', async () => {
      const result = fileSync(
        createFileEntry({ sha: 'xyz', deleted: 12 }),
        createFileEntry({ sha: 'abc' }),
        createFileEntry({ sha: 'abc' }),
      );

      await expect(result).toEqual({
        action: 'delete',
        target: 'fileB',
      });
    });

    test('Case D.1.8 A:deleted B:modified; should target a', async () => {
      const result = fileSync(
        createFileEntry({ sha: 'abc', deleted: 12 }),
        createFileEntry({ sha: 'def', file: createFile('file-b') }),
        createFileEntry({ sha: 'xyz' }),
      );

      await expect(result).toEqual({
        action: 'set',
        file: {
          content: 'I am the content of image',
          fileName: 'file-b',
          opts: {},
        },
        target: 'fileA',
      });
    });

    test('Case D.1.9 A:deleted, B:deleted', async () => {
      const result = fileSync(
        createFileEntry({ sha: 'xyz', deleted: 12 }),
        createFileEntry({ sha: 'abc', deleted: 12 }),
        createFileEntry({ sha: 'abc' }),
      );

      await expect(result).toEqual(undefined);
    });
  });
});

import type { FileSyncObj } from '../file-sync';
import { fileSync } from '../file-sync';

const createFileEntry = (
  fileEntry: Partial<FileSyncObj> = {},
): FileSyncObj => ({
  uid: 'test:one.md',
  deleted: undefined,
  sha: '3edsds',
  ...fileEntry,
});

describe('File states', () => {
  test('Case A works when files are same', async () => {
    const result = fileSync({
      fileA: createFileEntry({ sha: '123sha' }),
      fileB: createFileEntry({ sha: '123sha' }),
      ancestor: undefined,
    });

    expect(result).toEqual({
      action: 'noop',
      target: undefined,
    });
  });

  test('Case A works when files are same, but ancestor sha is out of date', async () => {
    const result = fileSync({
      fileA: createFileEntry({ sha: '123sha' }),
      fileB: createFileEntry({ sha: '123sha' }),
      ancestor: createFileEntry({ sha: 'oldsha' }),
    });

    expect(result).toEqual({
      action: 'set',
      target: 'ancestor',
    });
  });

  test('Case B works when both files are undefined', async () => {
    const result = fileSync({
      fileA: undefined,
      fileB: undefined,
      ancestor: undefined,
    });
    expect(result).toEqual({
      action: 'noop',
      target: undefined,
    });
  });

  test('Case C works when file B is undefined but file A is defined', async () => {
    const result = fileSync({
      fileA: createFileEntry({ sha: '123sha' }),
      fileB: undefined,
      ancestor: undefined,
    });

    expect(result).toEqual({
      action: 'set',
      target: 'fileB',
    });
  });

  test('Case C works when file A is undefined but file B is defined', async () => {
    const result = fileSync({
      fileA: undefined,
      fileB: createFileEntry({ sha: '123sha' }),
      ancestor: undefined,
    });

    expect(result).toEqual({
      action: 'set',
      target: 'fileA',
    });
  });

  test('Case C works when file A is undefined but file B is deleted', async () => {
    const result = fileSync({
      fileA: undefined,
      fileB: createFileEntry({ sha: '123sha', deleted: 12 }),
      ancestor: undefined,
    });

    expect(result).toEqual({
      action: 'noop',
      target: undefined,
    });
  });

  test('Case C works when file B is undefined but file A is deleted', async () => {
    const result = fileSync({
      fileA: createFileEntry({ sha: '123sha', deleted: 12 }),
      fileB: undefined,
      ancestor: undefined,
    });

    expect(result).toEqual({
      action: 'noop',
      target: undefined,
    });
  });

  describe('Case D both are defined', () => {
    test('Case D: Misc when sha is same, one is deleted and source is not defined', async () => {
      let result = fileSync({
        fileA: createFileEntry({ sha: '123sha', deleted: 1 }),
        fileB: createFileEntry({ sha: '123sha' }),
        ancestor: undefined,
      });

      expect(result).toEqual({
        action: 'conflict',
        target: undefined,
      });

      result = fileSync({
        fileA: createFileEntry({ sha: '123sha' }),
        fileB: createFileEntry({ sha: '123sha', deleted: 1 }),
        ancestor: undefined,
      });

      expect(result).toEqual({
        action: 'conflict',
        target: undefined,
      });
    });

    test('Case D: Misc when sha is same but file A is deleted', async () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: '123sha', deleted: 1 }),
        fileB: createFileEntry({ sha: '123sha' }),
        ancestor: createFileEntry({ sha: '123sha' }),
      });

      expect(result).toEqual({
        action: 'delete',
        target: 'fileB',
      });
    });

    test('Case D: Misc when sha is same but file B is deleted', async () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: '123sha' }),
        fileB: createFileEntry({ sha: '123sha', deleted: 1 }),
        ancestor: createFileEntry({ sha: '123sha' }),
      });

      expect(result).toEqual({
        action: 'delete',
        target: 'fileA',
      });
    });

    test('Case D: Misc when sha is different and one of the file is deleted', async () => {
      let result = fileSync({
        fileA: createFileEntry({ sha: 'abcsha' }),
        fileB: createFileEntry({ sha: '123sha', deleted: 1 }),
        ancestor: createFileEntry({ sha: '123sha' }),
      });

      // it should overwrite the deletion of fileB
      expect(result).toEqual({
        action: 'set',
        target: 'fileB',
      });

      // fileA was modified and also deleted
      result = fileSync({
        fileA: createFileEntry({ sha: 'abcsha', deleted: 1 }),
        fileB: createFileEntry({ sha: '123sha' }),
        ancestor: createFileEntry({ sha: '123sha' }),
      });

      // it should delete fileB
      expect(result).toEqual({
        action: 'delete',
        target: 'fileB',
      });
    });

    test('Case D.2 throws error if ancestor file is not defined', async () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: 'abc' }),
        fileB: createFileEntry({ sha: 'def' }),
        ancestor: undefined,
      });

      await expect(result).toEqual({ action: 'conflict' });
    });

    test('Case D.1.1 no change', async () => {
      // Note we might not cover all the D.1.1 code
      //  as we check for this early in Case A
      const result = fileSync({
        fileA: createFileEntry({ sha: 'abc' }),
        fileB: createFileEntry({ sha: 'abc' }),
        ancestor: undefined,
      });

      await expect(result).toEqual({
        action: 'noop',
        target: undefined,
      });
    });

    test('Case D.1.2 A:no change, B:modified', async () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: 'abc' }),
        fileB: createFileEntry({ sha: 'bcd' }),
        ancestor: createFileEntry({ sha: 'abc' }),
      });

      await expect(result).toEqual({
        action: 'set',
        target: 'fileA',
      });
    });

    test('ancestor file entry isDeleted', () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: '123sha' }),
        fileB: createFileEntry({ sha: '123sha' }),
        ancestor: createFileEntry({ sha: '123sha', deleted: 1 }),
      });

      expect(result).toEqual({
        action: 'noop',
        target: undefined,
      });
    });

    test('Case D.1.3 A:no change, B:deleted', async () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: 'abc' }),
        fileB: createFileEntry({ sha: 'bcd', deleted: 12 }),
        ancestor: createFileEntry({ sha: 'abc' }),
      });

      await expect(result).toEqual({
        action: 'delete',
        target: 'fileA',
      });
    });

    test('Case D.1.4 A:modified, B:no change', async () => {
      const fileEntryA = createFileEntry({
        sha: 'def',
      });
      const fileEntryB = createFileEntry({
        sha: 'abc',
      });
      const result = fileSync({
        fileA: fileEntryA,
        fileB: fileEntryB,
        ancestor: createFileEntry({ sha: 'abc' }),
      });

      await expect(result).toEqual({
        action: 'set',

        target: 'fileB',
      });
    });

    test('Case D.1.5 conflict if both modified', async () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: 'abc' }),
        fileB: createFileEntry({ sha: 'def' }),
        ancestor: createFileEntry({ sha: 'xyz' }),
      });

      await expect(result).toEqual({ action: 'conflict' });
    });

    test('Case D.1.6 A:modified, B:deleted; should target b', async () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: 'abc' }),
        fileB: createFileEntry({ sha: 'def', deleted: 12 }),
        ancestor: createFileEntry({ sha: 'xyz' }),
      });

      await expect(result).toEqual({
        action: 'set',

        target: 'fileB',
      });
    });

    test('Case D.1.7 A:deleted, B:no change', async () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: 'xyz', deleted: 12 }),
        fileB: createFileEntry({ sha: 'abc' }),
        ancestor: createFileEntry({ sha: 'abc' }),
      });

      await expect(result).toEqual({
        action: 'delete',
        target: 'fileB',
      });
    });

    test('Case D.1.8 A:deleted B:modified; should target a', async () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: 'abc', deleted: 12 }),
        fileB: createFileEntry({ sha: 'def' }),
        ancestor: createFileEntry({ sha: 'xyz' }),
      });

      await expect(result).toEqual({
        action: 'set',

        target: 'fileA',
      });
    });

    test('Case D.1.9 A:deleted, B:deleted', async () => {
      const result = fileSync({
        fileA: createFileEntry({ sha: 'xyz', deleted: 12 }),
        fileB: createFileEntry({ sha: 'abc', deleted: 12 }),
        ancestor: createFileEntry({ sha: 'abc' }),
      });

      await expect(result).toEqual({
        action: 'noop',
        target: undefined,
      });
    });
  });
});

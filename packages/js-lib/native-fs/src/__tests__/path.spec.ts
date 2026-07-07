import { describe, expect, it } from 'vitest';

import { isNativeFsError, NATIVE_FS_ERROR_CODE } from '../errors';
import { joinPath, splitFilePath, splitPath } from '../path';

describe('splitPath', () => {
  it('splits valid relative paths', () => {
    expect(splitPath('')).toEqual([]);
    expect(splitPath('a.md')).toEqual(['a.md']);
    expect(splitPath('a/b/c.md')).toEqual(['a', 'b', 'c.md']);
    expect(splitPath('with space/note.md')).toEqual(['with space', 'note.md']);
  });

  it.each([
    ['/leading.md', 'leading slash'],
    ['trailing/', 'trailing slash'],
    ['a//b.md', 'empty segment'],
    ['.', 'dot segment'],
    ['a/../b.md', 'dot-dot segment'],
    ['a\\b.md', 'backslash'],
  ])('rejects %s (%s)', (path) => {
    let error: unknown;
    try {
      splitPath(path);
    } catch (e) {
      error = e;
    }
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.invalidPath)).toBe(true);
  });
});

describe('splitFilePath', () => {
  it('rejects the empty path', () => {
    let error: unknown;
    try {
      splitFilePath('');
    } catch (e) {
      error = e;
    }
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.invalidPath)).toBe(true);
  });
});

describe('joinPath', () => {
  it('round-trips with splitPath', () => {
    expect(joinPath(splitPath('a/b/c.md'))).toBe('a/b/c.md');
    expect(joinPath([])).toBe('');
  });
});

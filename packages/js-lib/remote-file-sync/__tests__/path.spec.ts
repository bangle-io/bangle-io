import { describe, expect, it } from 'vitest';
import {
  assertValidFsPath,
  isValidFsPath,
  isValidWsName,
  wsNameOfFsPath,
} from '../path';

describe('isValidFsPath', () => {
  it('accepts workspace-scoped file paths', () => {
    expect(isValidFsPath('ws/a.md')).toBe(true);
    expect(isValidFsPath('ws/dir/sub/file.md')).toBe(true);
  });

  it('rejects traversal and unsafe paths', () => {
    expect(isValidFsPath('')).toBe(false);
    expect(isValidFsPath('ws')).toBe(false); // no path segment
    expect(isValidFsPath('/ws/a.md')).toBe(false); // absolute
    expect(isValidFsPath('ws/../secret')).toBe(false);
    expect(isValidFsPath('ws/./a.md')).toBe(false);
    expect(isValidFsPath('ws//a.md')).toBe(false); // empty segment
    expect(isValidFsPath('ws\\a.md')).toBe(false); // backslash
    expect(isValidFsPath('ws/a.md/')).toBe(false); // trailing slash
    expect(isValidFsPath('ws/a\0.md')).toBe(false); // NUL
    expect(isValidFsPath('../a.md')).toBe(false);
  });
});

describe('wsNameOfFsPath', () => {
  it('returns the first segment', () => {
    expect(wsNameOfFsPath('myNotes/dir/a.md')).toBe('myNotes');
  });

  it('throws on invalid paths', () => {
    expect(() => wsNameOfFsPath('../evil')).toThrowError();
    expect(() => assertValidFsPath('ws/../x')).toThrowError();
  });
});

describe('isValidWsName', () => {
  it('accepts simple names and rejects separators/traversal', () => {
    expect(isValidWsName('myNotes')).toBe(true);
    expect(isValidWsName('')).toBe(false);
    expect(isValidWsName('..')).toBe(false);
    expect(isValidWsName('a/b')).toBe(false);
    expect(isValidWsName('a\\b')).toBe(false);
  });
});

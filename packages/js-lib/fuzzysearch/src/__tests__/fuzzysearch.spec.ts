// fuzzySearch.test.ts
import { describe, expect, it } from 'vitest';
import { fuzzySearch } from '..';

describe('fuzzySearch', () => {
  it('returns true when the needle is empty', () => {
    expect(fuzzySearch('', 'haystack')).toBe(true);
  });

  it('returns true when needle matches haystack exactly (case-insensitive)', () => {
    expect(fuzzySearch('abc', 'abc')).toBe(true);
    expect(fuzzySearch('ABC', 'abc')).toBe(true);
  });

  it('returns true when needle characters are in haystack in order', () => {
    expect(fuzzySearch('abc', 'aXbYcZ')).toBe(true);
  });

  it('returns false when needle characters are not in haystack in order', () => {
    expect(fuzzySearch('abc', 'acb')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(fuzzySearch('aBc', 'A_B_C')).toBe(true);
  });

  it('returns false when needle characters are not in haystack at all', () => {
    expect(fuzzySearch('abc', 'def')).toBe(false);
  });

  it('handles Unicode characters', () => {
    expect(fuzzySearch('ü', 'Über')).toBe(true);
  });
});

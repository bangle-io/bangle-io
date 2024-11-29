import { describe, expect, it, test } from 'vitest';

import { getWsName } from '../helpers';

describe('getWsName', () => {
  test('works without extension', () => {
    expect(getWsName('wsName:filePath')).toBe('wsName');
  });

  test('works with extension', () => {
    expect(getWsName('wsName:filePath.md')).toBe('wsName');
  });
  test('works with wsNAme', () => {
    expect(getWsName('wsName')).toBe('wsName');
  });
});

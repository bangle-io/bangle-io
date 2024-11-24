import { describe, expect, it, test } from 'vitest';

import { pathnameToWsPath, wsPathToPathname } from '../routing';

describe('wsPathToPathname', () => {
  it('should convert wsPath to pathname correctly', () => {
    const wsPath = 'my-test-ws:my/file/path.md';
    const expected = '/ws/my-test-ws/my/file/path.md';
    expect(wsPathToPathname(wsPath)).toBe(expected);
  });

  it('should encode URI components', () => {
    const wsPath = 'my test ws:my/file path.md';
    const expected = '/ws/my%20test%20ws/my/file%20path.md';
    expect(wsPathToPathname(wsPath)).toBe(expected);
  });

  it('should handle empty file path', () => {
    const wsPath = 'my-test-ws:';
    const expected = '/ws/my-test-ws/';

    expect(() => wsPathToPathname(wsPath)).toThrowError(/Invalid filePath/);
  });
});

describe('pathnameToWsPath', () => {
  it('should convert pathname to wsPath correctly', () => {
    const pathname = '/ws/my-test-ws/my/file/path.md';
    const expected = {
      wsName: 'my-test-ws',
      wsPath: 'my-test-ws:my/file/path.md',
    };
    expect(pathnameToWsPath(pathname)).toEqual(expected);
  });

  it('should decode URI components', () => {
    const pathname = '/ws/my%20test%20ws/my/file%20path.md';
    const expected = {
      wsName: 'my test ws',
      wsPath: 'my test ws:my/file path.md',
    };
    expect(pathnameToWsPath(pathname)).toEqual(expected);
  });

  it('should handle invalid pathname', () => {
    const pathname = '/invalid/path';
    const expected = { wsName: undefined, wsPath: undefined };
    expect(pathnameToWsPath(pathname)).toEqual(expected);
  });

  it('should handle empty pathname', () => {
    const pathname = '';
    const expected = { wsName: undefined, wsPath: undefined };
    expect(pathnameToWsPath(pathname)).toEqual(expected);
  });
});

describe('wsPathToPathname', () => {
  test('converts wsPath with special characters', () => {
    expect(wsPathToPathname('test:test/path@123.md')).toEqual(
      '/ws/test/test/path%40123.md',
    );
  });

  test('throws error for empty wsPath', () => {
    expect(() => wsPathToPathname('')).toThrow();
  });

  test('throws error for wsPath with no filePath', () => {
    expect(() => wsPathToPathname('test:')).toThrow();
  });

  test('handles wsPath with nested paths', () => {
    expect(wsPathToPathname('test:dir/subdir/file.md')).toEqual(
      '/ws/test/dir/subdir/file.md',
    );
  });

  test('encodes wsName and filePath correctly', () => {
    expect(wsPathToPathname('my test ws:my/file path.md')).toEqual(
      '/ws/my%20test%20ws/my/file%20path.md',
    );
  });

  test('handles wsPath with encoded slashes', () => {
    expect(wsPathToPathname('test:some%2Fpath%2Ffile.md')).toEqual(
      '/ws/test/some%252Fpath%252Ffile.md',
    );
  });
});

describe('pathnameToWsPath', () => {
  test('decodes encoded pathname', () => {
    expect(pathnameToWsPath('/ws/test/test%2Fpath%40123.md')).toEqual({
      wsName: 'test',
      wsPath: 'test:test/path@123.md',
    });
  });

  test('handles pathname with extra slashes', () => {
    expect(pathnameToWsPath('/ws/test/some/path/')).toEqual({
      wsName: 'test',
      wsPath: 'test:some/path/',
    });
  });

  test('returns undefined for invalid pathname', () => {
    expect(pathnameToWsPath('/hi/world')).toEqual({
      wsName: undefined,
      wsPath: undefined,
    });
  });

  test('returns undefined for empty pathname', () => {
    expect(pathnameToWsPath()).toEqual({
      wsName: undefined,
      wsPath: undefined,
    });
  });

  test('handles pathname with only wsName', () => {
    expect(pathnameToWsPath('/ws/world')).toEqual({
      wsName: 'world',
      wsPath: undefined,
    });
  });

  test('decodes encoded wsName and filePath', () => {
    expect(pathnameToWsPath('/ws/my%20test%20ws/my%20file.md')).toEqual({
      wsName: 'my test ws',
      wsPath: 'my test ws:my file.md',
    });
  });

  test('handles pathname with encoded slashes in filePath', () => {
    expect(pathnameToWsPath('/ws/test/some%2Fpath%2Ffile.md')).toEqual({
      wsName: 'test',
      wsPath: 'test:some/path/file.md',
    });
  });

  test('handles pathname with special characters in wsName', () => {
    expect(pathnameToWsPath('/ws/test%40ws/some/file.md')).toEqual({
      wsName: 'test@ws',
      wsPath: 'test@ws:some/file.md',
    });
  });
});

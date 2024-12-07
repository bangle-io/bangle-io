import { describe, expect, it, test } from 'vitest';
import {
  assertSplitWsPath,
  assertedResolvePath,
  getExtension,
  pathJoin,
  resolveDirWsPath,
  resolvePath,
  splitWsPath,
  validateWsPath,
} from '../helpers';

describe('resolveDirWsPath', () => {
  it('should work with dir wsPaths', () => {
    const wsPath = 'ws:';
    const result = resolveDirWsPath(wsPath);
    expect(result).toEqual({
      wsName: 'ws',
      dirPath: '',
    });
  });

  it('should work with nested dir wsPaths', () => {
    const wsPath = 'ws:dir/subdir/';
    const result = resolveDirWsPath(wsPath);
    expect(result).toEqual({
      wsName: 'ws',
      dirPath: 'dir/subdir',
    });
  });

  it('should return undefined for empty string', () => {
    const result = resolveDirWsPath('ws:dir.md');
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const result = resolveDirWsPath('ws:dir/x.md');
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const result = resolveDirWsPath('w');
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const result = resolveDirWsPath('w.md');
    expect(result).toBeUndefined();
  });
});
describe('resolvePath - Valid Inputs', () => {
  it('should resolve wsPath with simple workspace and file', () => {
    const wsPath = 'workspace1:file.txt';
    const result = resolvePath(wsPath);
    expect(result).toEqual({
      wsPath: 'workspace1:file.txt',
      wsName: 'workspace1',
      filePath: 'file.txt',
      dirPath: '',
      fileName: 'file.txt',
      fileNameWithoutExt: 'file',
    });
  });

  it('should resolve wsPath with nested directories', () => {
    const wsPath = 'ws:dir/subdir/file.md';
    const result = resolvePath(wsPath);
    expect(result).toEqual({
      wsPath: 'ws:dir/subdir/file.md',
      wsName: 'ws',
      filePath: 'dir/subdir/file.md',
      dirPath: 'dir/subdir',
      fileName: 'file.md',
      fileNameWithoutExt: 'file',
    });
  });

  it('should resolve wsPath with absolute file path', () => {
    const wsPath = 'ws:/absolute/path/file.md';
    const result = resolvePath(wsPath);
    expect(result).toBeUndefined();
  });

  it('should resolve wsPath with relative directory path', () => {
    const wsPath = 'ws:relative/path/';
    const result = resolvePath(wsPath);
    expect(result).toBeUndefined();
  });

  it('should resolve wsPath with file at root', () => {
    const wsPath = 'ws:file.md';
    const result = resolvePath(wsPath);
    expect(result).toEqual({
      wsPath: 'ws:file.md',
      wsName: 'ws',
      filePath: 'file.md',
      dirPath: '',
      fileName: 'file.md',
      fileNameWithoutExt: 'file',
    });
  });
});

describe('resolvePath - Invalid Inputs', () => {
  it('should return undefined for empty string', () => {
    const result = resolvePath('');
    expect(result).toBeUndefined();
  });

  it('should return undefined for null input', () => {
    const result = resolvePath(null as any);
    expect(result).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    const result = resolvePath(undefined as any);
    expect(result).toBeUndefined();
  });

  it('should return undefined for non-string input', () => {
    const result = resolvePath(123 as any);
    expect(result).toBeUndefined();
  });

  it('should return undefined for missing colon', () => {
    const result = resolvePath('workspace1file.txt');
    expect(result).toBeUndefined();
  });

  it('should return undefined for multiple colons', () => {
    const result = resolvePath('ws:name:file.txt');
    expect(result).toEqual({
      dirPath: '',
      fileName: 'name:file.txt',
      fileNameWithoutExt: 'name:file',
      filePath: 'name:file.txt',
      wsName: 'ws',
      wsPath: 'ws:name:file.txt',
    });
  });

  it('should return undefined for empty wsName', () => {
    const result = resolvePath(':file.txt');
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty filePath', () => {
    const result = resolvePath('ws:');
    expect(result).toBeUndefined();
  });

  it('should return undefined for wsPath containing "//"', () => {
    const result = resolvePath('ws://file.txt');
    expect(result).toBeUndefined();
  });

  it('should return undefined for wsPath with empty path segment', () => {
    const result = resolvePath('ws:dir//file.txt');
    expect(result).toBeUndefined();
  });

  it('should return undefined for wsPath with trailing slash and colon', () => {
    const result = resolvePath('ws:/dir/file.txt:');
    expect(result).toBeUndefined();
  });

  it('should return undefined for wsPath with whitespace only', () => {
    const result = resolvePath('   ');
    expect(result).toBeUndefined();
  });

  it('should return undefined for wsPath with colon only', () => {
    const result = resolvePath(':');
    expect(result).toBeUndefined();
  });

  it('should resolve wsPath with special characters in wsName', () => {
    const result = resolvePath('ws@#$:file.txt');
    expect(result).toEqual({
      wsPath: 'ws@#$:file.txt',
      wsName: 'ws@#$',
      filePath: 'file.txt',
      dirPath: '',
      fileName: 'file.txt',
      fileNameWithoutExt: 'file',
    });
  });

  it('should resolve wsPath with special characters in filePath', () => {
    const result = resolvePath('ws:file@#$%.txt');
    expect(result).toEqual({
      wsPath: 'ws:file@#$%.txt',
      wsName: 'ws',
      filePath: 'file@#$%.txt',
      dirPath: '',
      fileName: 'file@#$%.txt',
      fileNameWithoutExt: 'file@#$%',
    });
  });
});

describe('resolvePath - Edge Cases', () => {
  it('should resolve wsPath with colon in filePath after the first colon', () => {
    const wsPath = 'ws:dir:subdir:file.txt';
    const result = resolvePath(wsPath);
    expect(result).toEqual({
      wsPath: 'ws:dir:subdir:file.txt',
      wsName: 'ws',
      filePath: 'dir:subdir:file.txt',
      dirPath: '',
      fileName: 'dir:subdir:file.txt',
      fileNameWithoutExt: 'dir:subdir:file',
    });
  });

  it('should return undefined when wsName contains colon', () => {
    const result = resolvePath('w:s:file.txt');
    expect(result).toEqual({
      dirPath: '',
      fileName: 's:file.txt',
      fileNameWithoutExt: 's:file',
      filePath: 's:file.txt',
      wsName: 'w',
      wsPath: 'w:s:file.txt',
    });
  });

  it('should resolve wsPath with numeric wsName and filePath', () => {
    const wsPath = '123:456/789.txt';
    const result = resolvePath(wsPath);
    expect(result).toEqual({
      wsPath: '123:456/789.txt',
      wsName: '123',
      filePath: '456/789.txt',
      dirPath: '456',
      fileName: '789.txt',
      fileNameWithoutExt: '789',
    });
  });

  it('should resolve wsPath with unicode characters', () => {
    const wsPath = '工作空间:文件.txt';
    const result = resolvePath(wsPath);
    expect(result).toEqual({
      wsPath: '工作空间:文件.txt',
      wsName: '工作空间',
      filePath: '文件.txt',
      dirPath: '',
      fileName: '文件.txt',
      fileNameWithoutExt: '文件',
    });
  });

  it('should resolve wsPath with leading and trailing whitespace', () => {
    const wsPath = '  ws  :  file.txt  ';
    const result = resolvePath(wsPath);
    expect(result).toEqual({
      wsPath: '  ws  :  file.txt  ',
      wsName: '  ws  ',
      filePath: '  file.txt  ',
      dirPath: '',
      fileName: '  file.txt  ',
      fileNameWithoutExt: '  file',
    });
  });

  it('should resolve wsPath with only whitespace in wsName', () => {
    const wsPath = '   :file.txt';
    const result = resolvePath(wsPath);
    expect(result).toEqual({
      wsPath: '   :file.txt',
      wsName: '   ',
      filePath: 'file.txt',
      dirPath: '',
      fileName: 'file.txt',
      fileNameWithoutExt: 'file',
    });
  });

  it('should resolve wsPath with only whitespace in filePath', () => {
    const wsPath = 'ws:   ';
    const result = resolvePath(wsPath);
    expect(result).toEqual({
      wsPath: 'ws:   ',
      wsName: 'ws',
      filePath: '   ',
      dirPath: '',
      fileName: '   ',
      fileNameWithoutExt: '   ',
    });
  });
});

describe('validateWsPath', () => {
  it('should return isValid true for valid wsPath', () => {
    const result = validateWsPath('ws:file.txt');
    expect(result).toEqual({
      isValid: true,
      wsName: 'ws',
      filePath: 'file.txt',
    });
  });

  it('should return isValid false for empty string', () => {
    const result = validateWsPath('');
    expect(result).toEqual({
      isValid: false,
      reason: 'wsPath is not a string or is empty',
      invalidPath: '',
    });
  });

  it('should return isValid false for missing colon', () => {
    const result = validateWsPath('workspace1file.txt');
    expect(result).toEqual({
      isValid: false,
      reason: 'Missing : in wsPath',
      invalidPath: 'workspace1file.txt',
    });
  });

  describe('validateWsPath', () => {
    describe('valid cases', () => {
      test.each([
        ['simple:path.md', 'simple', 'path.md'],
        ['ws-1:some/nested/path.md', 'ws-1', 'some/nested/path.md'],
        ['workspace:file.md', 'workspace', 'file.md'],
        ['ws:path/without/extension', 'ws', 'path/without/extension'],
        ['ws:path:/more', 'ws', 'path:/more'],
        ['ws name:path', 'ws name', 'path'],
        ['/ws:path', '/ws', 'path'],
      ])(
        'should validate "%s" correctly',
        (wsPath, expectedWsName, expectedFilePath) => {
          const result = validateWsPath(wsPath);
          expect(result).toEqual({
            isValid: true,
            wsName: expectedWsName,
            filePath: expectedFilePath,
          });
        },
      );
    });

    describe('invalid cases', () => {
      test.each([
        ['', 'wsPath is not a string or is empty'],
        [' ', 'Missing : in wsPath'],
        ['invalid//path', 'Invalid path segment'],
        [':', 'wsName or filePath is missing'],
        [':path', 'wsName or filePath is missing'],
        ['ws:/path', 'filePath should not start with /'],
        ['ws:path//', 'Invalid path segment'],
      ])(
        'should invalidate "%s" with reason "%s"',
        (wsPath, expectedReason) => {
          const result = validateWsPath(wsPath);
          expect(result).toEqual({
            isValid: false,
            reason: expectedReason,
            invalidPath: wsPath,
          });
        },
      );
    });

    test('should handle undefined input', () => {
      // @ts-expect-error testing invalid input
      const result = validateWsPath(undefined);
      expect(result).toEqual({
        isValid: false,
        reason: 'wsPath is not a string or is empty',
        invalidPath: undefined,
      });
    });
  });
});

describe('assertWsPath', () => {
  it('should not throw for valid wsPath', () => {
    expect(() => assertSplitWsPath('ws:file.txt')).not.toThrow();
  });

  it('should throw for invalid wsPath', () => {
    expect(() => assertSplitWsPath('')).toThrowError(
      'wsPath is not a string or is empty',
    );
  });

  // ...additional tests for assertWsPath...
});

describe('assertedResolvePath', () => {
  it('should return resolved path for valid wsPath', () => {
    const result = assertedResolvePath('ws:file.txt');
    expect(result).toHaveProperty('wsName', 'ws');
  });

  it('should throw for invalid wsPath', () => {
    expect(() => assertedResolvePath('')).toThrowError('Invalid file wsPath');
  });

  // ...additional tests for assertedResolvePath...
});

describe('splitWsPath', () => {
  it('should correctly split a valid wsPath', () => {
    const result = splitWsPath('workspace1:file.txt');
    expect(result).toEqual(['workspace1', 'file.txt']);
  });

  it('should correctly split wsPath with nested directories', () => {
    const result = splitWsPath('ws:dir/subdir/file.md');
    expect(result).toEqual(['ws', 'dir/subdir/file.md']);
  });

  it('should return undefined for empty string', () => {
    const result = splitWsPath('');
    expect(result).toEqual(['', '']);
  });

  it('should return undefined for missing colon', () => {
    const result = splitWsPath('workspacefile.txt');
    expect(result).toEqual(['', 'workspacefile.txt']);
  });

  it('should handle multiple colons correctly', () => {
    const result = splitWsPath('ws:path:with:colons.txt');
    expect(result).toEqual(['ws', 'path:with:colons.txt']);
  });

  it('should return undefined for path starting with colon', () => {
    const result = splitWsPath(':file.txt');
    expect(result).toEqual(['', 'file.txt']);
  });

  it('should work for path ending with colon', () => {
    const result = splitWsPath('workspace:');
    expect(result).toEqual(['workspace', '']);
  });

  it('should handle whitespace correctly', () => {
    const result = splitWsPath('  workspace  :  file.txt  ');
    expect(result).toEqual(['  workspace  ', '  file.txt  ']);
  });

  it('should handle unicode characters', () => {
    const result = splitWsPath('工作空间:文件.txt');
    expect(result).toEqual(['工作空间', '文件.txt']);
  });
});

describe('getExtension', () => {
  test('returns undefined for strings without extension', () => {
    expect(getExtension('filename')).toBe(undefined);
    expect(getExtension('path/to/filename')).toBe(undefined);
    expect(getExtension('')).toBe(undefined);
  });

  test('returns extension for files with extension', () => {
    expect(getExtension('file.md')).toBe('.md');
    expect(getExtension('file.txt')).toBe('.txt');
    expect(getExtension('file.test.ts')).toBe('.ts');
  });

  test('handles paths with directories correctly', () => {
    expect(getExtension('path/to/file.md')).toBe('.md');
    expect(getExtension('deeply/nested/path/file.txt')).toBe('.txt');
    expect(getExtension('/root/path/file.json')).toBe('.json');
  });

  test('handles dots in directory names correctly', () => {
    expect(getExtension('path.with.dots/file.md')).toBe('.md');
    expect(getExtension('my.folder/sub.dir/file.txt')).toBe('.txt');
  });

  test('should work with wspath', () => {
    expect(getExtension('ws:file.md')).toBe('.md');
    expect(getExtension('ws:file.txt')).toBe('.txt');
    expect(getExtension('ws:file.test.ts')).toBe('.ts');
  });

  test('should work with wspath with dot in it', () => {
    expect(getExtension('w.s:file.md')).toBe('.md');
  });

  test('should work with dir wspath with dot in it', () => {
    expect(getExtension('w.s:dir')).toBe(undefined);
  });

  test('should work with dir wspath with dot in it', () => {
    expect(getExtension('w.s:d.r')).toBe('.r');
  });
  test('should work with dir wspath with dot in it', () => {
    expect(getExtension('.:.r')).toBe('.r');
  });
});

describe('pathJoin', () => {
  it('should join paths without any slashes correctly', () => {
    expect(pathJoin('foo', 'bar', 'baz')).toBe('foo/bar/baz');
  });

  it('should handle trailing slashes in the first argument', () => {
    expect(pathJoin('foo/', 'bar', 'baz')).toBe('foo/bar/baz');
  });

  it('should handle leading and trailing slashes in middle arguments', () => {
    expect(pathJoin('foo/', '/bar/', 'baz')).toBe('foo/bar/baz');
  });

  it('should handle leading slashes in all arguments', () => {
    expect(pathJoin('/foo', '/bar', '/baz')).toBe('/foo/bar/baz');
  });

  it('should handle multiple consecutive slashes', () => {
    expect(pathJoin('foo//', '//bar//', 'baz//')).toBe('foo/bar/baz');
  });

  it('should handle single arguments with slashes', () => {
    expect(pathJoin('/foo/')).toBe('/foo');
    expect(pathJoin('foo/')).toBe('foo');
    expect(pathJoin('/foo/bar/')).toBe('/foo/bar');
  });

  it('should return an empty string when no arguments are provided', () => {
    expect(pathJoin()).toBe('');
  });

  it('should handle empty strings within arguments', () => {
    expect(pathJoin('foo', '', 'baz')).toBe('foo/baz');
    expect(pathJoin('', 'bar', '')).toBe('bar');
  });

  it('should preserve absolute paths', () => {
    expect(pathJoin('/foo', 'bar', 'baz')).toBe('/foo/bar/baz');
    expect(pathJoin('/foo/', '/bar/', '/baz/')).toBe('/foo/bar/baz');
  });

  it('should handle relative paths correctly', () => {
    expect(pathJoin('./foo', 'bar', 'baz')).toBe('./foo/bar/baz');
    expect(pathJoin('../foo/', '/bar/', 'baz/')).toBe('../foo/bar/baz');
  });

  it('should handle root path', () => {
    expect(pathJoin('', 'path', 'to', 'file')).toBe('path/to/file');
  });

  it('should handle root path', () => {
    expect(pathJoin('', 'ut.md')).toBe('ut.md');
  });
});

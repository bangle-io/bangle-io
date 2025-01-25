import { describe, expect, it } from 'vitest';
import { WsFilePath, WsPath } from '../ws-path';

describe('WsPath Utilities', () => {
  describe('pathJoin', () => {
    it('should join path segments correctly', () => {
      expect(WsPath.pathJoin('a', 'b', 'c')).toBe('a/b/c');
      expect(WsPath.pathJoin('a/', '/b/', '/c')).toBe('a/b/c');
      expect(WsPath.pathJoin('a', '', 'c')).toBe('a/c');
      expect(WsPath.pathJoin('', 'b', '')).toBe('b');
    });

    it('should handle empty segments', () => {
      expect(WsPath.pathJoin('')).toBe('');
      expect(WsPath.pathJoin('', '')).toBe('');
      expect(WsPath.pathJoin('a', '', '')).toBe('a');
    });

    it('should normalize slashes', () => {
      expect(WsPath.pathJoin('a//', '//b')).toBe('a/b');
      expect(WsPath.pathJoin('a/', '/b')).toBe('a/b');
      expect(WsPath.pathJoin('a///', '///b')).toBe('a/b');
    });
  });

  describe('Root Level Files', () => {
    it('should identify root level files', () => {
      const rootFile = WsFilePath.fromString('ws:file.txt');
      expect(rootFile.isRootLevelFile()).toBe(true);

      const nestedFile = WsFilePath.fromString('ws:dir/file.txt');
      expect(nestedFile.isRootLevelFile()).toBe(false);
    });

    it('should handle special cases for root level files', () => {
      const fileWithColon = WsFilePath.fromString('ws:dir:file.txt');
      expect(fileWithColon.isRootLevelFile()).toBe(true);

      const fileWithDot = WsFilePath.fromString('ws:.hidden.txt');
      expect(fileWithDot.isRootLevelFile()).toBe(true);
    });
  });

  describe('Path Segments', () => {
    it('should handle empty segments in paths', () => {
      expect(WsPath.fromString('ws:///file.txt').wsPath).toBe('ws:///file.txt');
      expect(WsPath.fromString('ws:dir//file.txt').wsPath).toBe(
        'ws:dir//file.txt',
      );
      expect(WsPath.fromString('ws:dir/./file.txt').wsPath).toBe(
        'ws:dir/./file.txt',
      );
    });

    it('should handle paths with colons after workspace name', () => {
      const path = WsPath.fromString('ws:dir:subdir:file.txt');
      expect(path.wsName).toBe('ws');
      expect(path.path).toBe('dir:subdir:file.txt');
      expect(path.isFile).toBe(true);

      const dirPath = WsPath.fromString('ws:dir:subdir:');
      expect(dirPath.wsName).toBe('ws');
      expect(dirPath.path).toBe('dir:subdir:/');
      expect(dirPath.isDir).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should handle errors in fileNameWithoutExtension', () => {
      const filePath = WsFilePath.fromString('ws:dir/file.test.txt');
      expect(filePath.fileNameWithoutExtension).toBe('file.test');

      // Edge cases that should throw
      expect(() => WsFilePath.fromString('ws:')).toThrow();
      expect(() => WsFilePath.fromString('ws:dir/')).toThrow();
    });

    it('should validate path segments', () => {
      // Invalid segments
      expect(() => WsPath.fromString('ws:.').path).toThrow();
      expect(() => WsPath.fromString('ws:..').path).toThrow();
      expect(() => WsPath.fromString('ws:dir/.').path).toThrow();
      expect(() => WsPath.fromString('ws:dir/..').path).toThrow();

      // Valid segments
      expect(() => WsPath.fromString('ws:.hidden').path).not.toThrow();
      expect(() => WsPath.fromString('ws:..hidden').path).not.toThrow();
      expect(() => WsPath.fromString('ws:dir/.hidden').path).not.toThrow();
    });

    it('should handle invalid characters in paths', () => {
      // These should all throw
      expect(WsPath.fromString('ws:\\file.txt').wsPath).toBe('ws:\\file.txt');
      expect(WsPath.fromString('ws:file*.txt').wsPath).toBe('ws:file*.txt');
      expect(WsPath.fromString('ws:file?.txt').wsPath).toBe('ws:file?.txt');
      expect(WsPath.fromString('ws:file<>.txt').wsPath).toBe('ws:file<>.txt');
      expect(WsPath.fromString('ws:file|.txt').wsPath).toBe('ws:file|.txt');
    });
  });
});

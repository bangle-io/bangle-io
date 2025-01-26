import { describe, expect, it } from 'vitest';
import { validateWsPath } from '../validation';
import { WsFilePath, WsPath } from '../ws-path';

describe('WsPath', () => {
  describe('Static Factory Methods', () => {
    describe('fromString', () => {
      it('should create WsPath from valid string', () => {
        const wsPath = WsPath.fromString('workspace1:file.txt');
        expect(wsPath.toString()).toBe('workspace1:file.txt');
      });

      it('should handle WsPath instance', () => {
        const original = WsPath.fromString('ws:file.md');
        const copy = WsPath.fromString(original);
        expect(copy).toBe(original);
      });

      it('should trim whitespace at start and end', () => {
        const wsPath = WsPath.fromString('  ws  :  file.txt  ');
        expect(wsPath.toString()).toBe('ws  :  file.txt');
        expect(wsPath.wsName).toBe('ws  ');
        expect(wsPath.path).toBe('  file.txt');
      });
    });

    describe('fromParts', () => {
      it('should combine wsName and path correctly', () => {
        const wsPath = WsPath.fromParts('workspace', 'dir/file.txt');
        expect(wsPath.toString()).toBe('workspace:dir/file.txt');
        expect(wsPath.wsName).toBe('workspace');
        expect(wsPath.path).toBe('dir/file.txt');
      });

      it('should throw for invalid workspace name', () => {
        expect(() => WsPath.fromParts('.', 'file.txt')).toThrow(
          'Invalid wsPath: Workspace name cannot be "."',
        );
        expect(() => WsPath.fromParts('', 'file.txt')).toThrow(
          'Invalid wsPath: Workspace name cannot be empty',
        );
      });

      it('should throw for invalid path', () => {
        expect(() => WsPath.fromParts('ws', 'dir//file.txt')).toThrow(
          'Invalid wsPath: Contains consecutive forward slashes',
        );
      });

      it('should handle special characters and whitespace', () => {
        const wsPath = WsPath.fromParts('ws@#$', 'dir/file@#$.txt');
        expect(wsPath.wsName).toBe('ws@#$');
        expect(wsPath.path).toBe('dir/file@#$.txt');

        const wsPath2 = WsPath.fromParts('  ws  ', '  file.txt  ');
        expect(wsPath2.wsName).toBe('  ws  ');
        expect(wsPath2.path).toBe('  file.txt  ');

        expect(WsPath.fromParts('ws', '/file.txt').wsPath).toBe('ws:file.txt');
      });
    });
  });

  describe('Validation Methods', () => {
    describe('isValidWsPath', () => {
      it('should return true for valid paths', () => {
        expect(validateWsPath('ws:file.txt')).toMatchObject({
          ok: true,
          data: {
            wsName: 'ws',
            filePath: 'file.txt',
          },
        });
        expect(validateWsPath('ws:dir/file.md')).toMatchObject({
          ok: true,
          data: {
            wsName: 'ws',
            filePath: 'dir/file.md',
          },
        });
        expect(validateWsPath('ws:')).toMatchObject({
          ok: true,
          data: {
            wsName: 'ws',
            filePath: '',
          },
        });
      });

      it('should return false for invalid paths', () => {
        expect(validateWsPath('')).toMatchObject({
          ok: false,
          validationError: {
            reason: 'Invalid wsPath: Expected a non-empty string',
            invalidPath: '',
          },
        });
        expect(validateWsPath('invalid')).toMatchObject({
          ok: false,
          validationError: {
            reason:
              'Invalid wsPath: Missing required ":" separator between workspace name and path',
            invalidPath: 'invalid',
          },
        });
        expect(validateWsPath(':file.txt')).toMatchObject({
          ok: false,
          validationError: {
            reason: 'Invalid wsPath: Workspace name cannot be empty',
            invalidPath: '',
          },
        });
        expect(validateWsPath('ws:/file.txt')).toMatchObject({
          ok: false,
          validationError: {
            reason:
              'Invalid wsPath: File path cannot start with a forward slash (/)',
            invalidPath: '/file.txt',
          },
        });
        expect(validateWsPath('ws:dir//file.txt')).toMatchObject({
          ok: false,
          validationError: {
            reason:
              'Invalid wsPath: Contains consecutive forward slashes (//) which is not allowed',
            invalidPath: 'dir//file.txt',
          },
        });
        expect(validateWsPath('ws:dir.')).toMatchObject({
          ok: false,
          validationError: {
            reason: 'Invalid wsPath: Path cannot end with a dot (.)',
            invalidPath: 'dir.',
          },
        });
      });
    });

    describe('safeParse', () => {
      it('should parse valid paths', () => {
        const result = WsPath.safeParse('ws:file.txt');
        expect(result.ok).toBe(true);
        if (result.ok && result.data) {
          expect(result.data instanceof WsPath).toBe(true);
          expect(result.data.wsName).toBe('ws');
          expect(result.data.path).toBe('file.txt');
        }
      });

      it('should return validation error for invalid paths', () => {
        const result = WsPath.safeParse('');
        expect(result.ok).toBe(false);
        if (!result.ok && result.validationError) {
          expect(result.validationError.reason).toContain('Invalid wsPath');
        }
      });
    });

    describe('assert', () => {
      it('should create WsPath for valid paths', () => {
        const wsPath = WsPath.assert('ws:file.txt');
        expect(wsPath instanceof WsPath).toBe(true);
        expect(wsPath.wsName).toBe('ws');
      });

      it('should throw for invalid paths', () => {
        expect(() => WsPath.assert('')).toThrow('Invalid wsPath');
        expect(() => WsPath.assert('invalid')).toThrow('Invalid wsPath');
      });

      it('should throw for invalid paths with colon', () => {
        expect(() => WsPath.assert('ws:/root/path/file.json')).toThrow(
          'Invalid wsPath',
        );
      });
    });
  });

  describe('Properties', () => {
    it('should correctly parse wsName', () => {
      const wsPath = WsPath.fromString('workspace1:dir/file.txt');
      expect(wsPath.wsName).toBe('workspace1');
    });

    it('should correctly parse path', () => {
      const wsPath = WsPath.fromString('ws:dir/subdir/file.md');
      expect(wsPath.path).toBe('dir/subdir/file.md');
    });

    it('should correctly get name for files and directories', () => {
      // Files
      const file = WsPath.fromString('ws:file.txt');
      expect(file.name).toBe('file.txt');

      const nestedFile = WsPath.fromString('ws:dir/subdir/nested.md');
      expect(nestedFile.name).toBe('nested.md');

      // Directories
      const dir = WsPath.fromString('ws:dir');
      expect(dir.name).toBe('dir');

      const dirWithSlash = WsPath.fromString('ws:dir/');
      expect(dirWithSlash.name).toBe('dir');

      const nestedDir = WsPath.fromString('ws:parent/child/');
      expect(nestedDir.name).toBe('child');

      // Root
      const root = WsPath.fromString('ws:');
      expect(root.name).toBe('');
    });

    it('should correctly identify extension', () => {
      const wsPath = WsPath.fromString('ws:file.txt');
      expect(wsPath.extension).toBe('.txt');

      const noExt = WsPath.fromString('ws:dir');
      expect(noExt.extension).toBeUndefined();
    });

    it('should correctly identify files and directories', () => {
      const file = WsPath.fromString('ws:file.txt');
      expect(file.isFile).toBe(true);
      expect(file.isDir).toBe(false);

      const dir = WsPath.fromString('ws:dir');
      expect(dir.isFile).toBe(false);
      expect(dir.isDir).toBe(true);
    });
  });

  describe('Immutable Operations', () => {
    it('should create new instance with withWsName', () => {
      const original = WsPath.fromString('ws1:file.txt');
      const modified = original.withWsName('ws2');
      expect(original.wsName).toBe('ws1');
      expect(modified.wsName).toBe('ws2');
      expect(modified.path).toBe('file.txt');
    });
  });

  describe('File and Directory Operations', () => {
    describe('isFileWsPath', () => {
      it('should identify file paths correctly', () => {
        expect(WsPath.isFileWsPath('ws:file.txt')).toBe(true);
        expect(WsPath.isFileWsPath('ws:dir/file.md')).toBe(true);
        expect(WsPath.isFileWsPath('ws:dir')).toBe(false);
        expect(WsPath.isFileWsPath('ws:')).toBe(false);
      });
    });

    describe('isDirWsPath', () => {
      it('should identify directory paths correctly', () => {
        expect(WsPath.isDirWsPath('ws:dir')).toBe(true);
        expect(WsPath.isDirWsPath('ws:')).toBe(true);
        expect(WsPath.isDirWsPath('ws:file.txt')).toBe(false);
        expect(WsPath.isDirWsPath('ws:dir/file.md')).toBe(false);
      });

      it('should handle paths with trailing slashes', () => {
        expect(WsPath.isDirWsPath('ws:dir/')).toBe(true);
        expect(WsPath.isDirWsPath('ws:dir/subdir/')).toBe(true);
        expect(WsPath.isDirWsPath('ws:file.txt/')).toBe(true);
      });
    });

    describe('safeParseFile', () => {
      it('should parse valid file paths', () => {
        const result = WsPath.safeParseFile('ws:file.txt');
        expect(result.ok).toBe(true);
        if (result.ok && result.data) {
          expect(result.data instanceof WsFilePath).toBe(true);
          expect(result.data.extension).toBe('.txt');
        }
      });

      it('should return error when parsing directory as file', () => {
        const result = WsPath.safeParseFile('ws:dir');
        expect(result.ok).toBe(false);
        if (!result.ok && result.validationError) {
          expect(result.validationError.reason).toContain(
            'Expected a file path',
          );
        }
      });
    });

    describe('assertFile', () => {
      it('should create WsPath for valid file paths', () => {
        const wsPath = WsPath.assertFile('ws:file.txt');
        expect(wsPath instanceof WsPath).toBe(true);
        expect(wsPath.isFile).toBe(true);
      });

      it('should throw for non-file paths', () => {
        expect(() => WsPath.assertFile('ws:dir')).toThrow();
        expect(() => WsPath.assertFile('ws:')).toThrow();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle paths with multiple dots', () => {
      const wsPath = WsPath.fromString('ws:file.test.ts');
      expect(wsPath.extension).toBe('.ts');
      expect(wsPath.isFile).toBe(true);
    });

    it('should treat directory paths with dots correctly', () => {
      const wsPath = WsPath.fromString('bangle-notes:.bangle/backups');
      expect(wsPath.isDir).toBe(true);
      expect(wsPath.isFile).toBe(false);
      expect(wsPath.extension).toBeUndefined();
      expect(wsPath.wsName).toBe('bangle-notes');
      expect(wsPath.path).toBe('.bangle/backups/');

      const wsPath2 = WsPath.fromString('ws:.config/settings');
      expect(wsPath2.isDir).toBe(true);
      expect(wsPath2.isFile).toBe(false);
      expect(wsPath2.extension).toBeUndefined();
      expect(wsPath2.path).toBe('.config/settings/');
    });

    it('should handle unicode characters', () => {
      const wsPath = WsPath.fromString('工作空间:文件.txt');
      expect(wsPath.wsName).toBe('工作空间');
      expect(wsPath.path).toBe('文件.txt');
      expect(wsPath.extension).toBe('.txt');
    });

    it('should handle special characters in wsName', () => {
      const wsPath = WsPath.fromString('ws@#$:file.txt');
      expect(wsPath.wsName).toBe('ws@#$');
      expect(wsPath.path).toBe('file.txt');
    });

    it('should handle special characters in path', () => {
      const wsPath = WsPath.fromString('ws:file@#$%.txt');
      expect(wsPath.path).toBe('file@#$%.txt');
      expect(wsPath.extension).toBe('.txt');
    });

    it('should handle empty path after colon', () => {
      const wsPath = WsPath.fromString('ws:');
      expect(wsPath.wsName).toBe('ws');
      expect(wsPath.path).toBe('');
      expect(wsPath.isDir).toBe(true);
    });

    it('should reject workspace name "."', () => {
      const result = WsPath.safeParse('.:file.txt');
      expect(result.ok).toBe(false);
      if (!result.ok && result.validationError) {
        expect(result.validationError.reason).toBe(
          'Invalid wsPath: Workspace name cannot be "."',
        );
      }
    });

    it('should handle workspace names with whitespace', () => {
      const wsPath = WsPath.fromString('  workspace name  :file.txt');
      expect(wsPath.wsName).toBe('workspace name  ');
      expect(wsPath.path).toBe('file.txt');
    });

    it('should reject path with slash plus extra colon, e.g. "ws:/dir:"', () => {
      const result = WsPath.safeParse('ws:/dir:');
      expect(result.ok).toBe(false);
      if (!result.ok && result.validationError) {
        expect(result.validationError.reason).toBe(
          'Invalid wsPath: File path cannot start with a forward slash (/)',
        );
      }
    });

    it('should be okay directory name with dot', () => {
      const result = WsPath.safeParse('ws:dir.1/file.txt');
      if (result.ok && result.data) {
        expect(result.data.path).toBe('dir.1/file.txt');
      } else {
        throw new Error('Failed to parse wsPath');
      }
    });

    it('should handle file name of "." or ".." as a directory', () => {
      const result1 = WsPath.safeParse('ws:.');
      expect(result1.ok).toBe(false);
      if (!result1.ok && result1.validationError) {
        expect(result1.validationError.reason).toBe(
          'Invalid wsPath: Path cannot end with a dot (.)',
        );
      }

      const result2 = WsPath.safeParse('ws:..');
      expect(result2.ok).toBe(false);
      if (!result2.ok && result2.validationError) {
        expect(result2.validationError.reason).toBe(
          'Invalid wsPath: Path cannot end with a dot (.)',
        );
      }
    });

    describe('handling dots in paths', () => {
      it('should handle dots in directory names', () => {
        // Single dot at start
        const path1 = WsPath.fromString('ws:.hidden');
        expect(path1.isDir).toBe(false);
        expect(path1.isFile).toBe(true);
        expect(path1.path).toBe('.hidden');

        // Multiple dots in directory name
        const path2 = WsPath.fromString('ws:my.dot.dir/file');
        expect(path2.isDir).toBe(true);
        expect(path2.isFile).toBe(false);
        expect(path2.path).toBe('my.dot.dir/file/');

        // Dot at end of directory name
        const path3 = WsPath.fromString('ws:dir./subdir');
        expect(path3.isDir).toBe(true);
        expect(path3.isFile).toBe(false);
        expect(path3.path).toBe('dir./subdir/');
      });

      it('should distinguish between dotted directories and files', () => {
        // Directory with dot but no extension
        const dir = WsPath.fromString('ws:my.dir/subdir');
        expect(dir.isDir).toBe(true);
        expect(dir.isFile).toBe(false);
        expect(dir.extension).toBeUndefined();

        // File with same prefix
        const file = WsPath.fromString('ws:my.dir/file.txt');
        expect(file.isDir).toBe(false);
        expect(file.isFile).toBe(true);
        expect(file.extension).toBe('.txt');

        // Hidden directory vs hidden file
        const hiddenDir = WsPath.fromString('ws:.config');
        expect(hiddenDir.isDir).toBe(false);
        expect(hiddenDir.isFile).toBe(true);
        expect(hiddenDir.extension).toBe('.config');

        const hiddenFile = WsPath.fromString('ws:.gitignore');
        expect(hiddenFile.isDir).toBe(false);
        expect(hiddenFile.isFile).toBe(true);
        expect(hiddenFile.extension).toBe('.gitignore');
      });

      it('should handle complex nested paths with dots', () => {
        const path1 = WsPath.fromString('ws:.config/v1.0/settings.json');
        expect(path1.isFile).toBe(true);
        expect(path1.extension).toBe('.json');

        const path2 = WsPath.fromString('ws:.git/.config/.internal');
        expect(path2.isDir).toBe(false);
        expect(path2.isFile).toBe(true);
        expect(path2.extension).toBe('.internal');

        // Mix of dotted dirs and normal dirs with file
        const path3 = WsPath.fromString('ws:src/v1.2.3/lib/.internal');
        expect(path3.isDir).toBe(false);
        expect(path3.isFile).toBe(true);
        expect(path3.extension).toBe('.internal');
        expect(path3.wsPath).toBe('ws:src/v1.2.3/lib/.internal');

        // Ensure directories with dots in middle segments are still directories
        const path4 = WsPath.fromString('ws:src/v1.2.3/lib/internal');
        expect(path4.isDir).toBe(true);
        expect(path4.isFile).toBe(false);
        expect(path4.extension).toBeUndefined();
        // TODO this should be `ws:src/v1.2.3/lib/internal/`
        expect(path4.wsPath).toBe('ws:src/v1.2.3/lib/internal');
      });

      it('should handle edge cases with dots', () => {
        // Version-like dots in middle segments are ok as directory
        const path3 = WsPath.fromString('ws:v1.0.0-beta/file');
        expect(path3.isDir).toBe(true);
        expect(path3.isFile).toBe(false);
        expect(path3.extension).toBeUndefined();
      });
    });

    it('should reject workspace name containing backslash', () => {
      const result = WsPath.safeParse('work\\space:file.txt');
      expect(result.ok).toBe(false);
      if (!result.ok && result.validationError) {
        expect(result.validationError.reason).toBe(
          'Workspace name contains invalid character "\\"',
        );
      }
    });

    it('should reject workspace name containing forward slash', () => {
      const result = WsPath.safeParse('work/space:file.txt');
      expect(result.ok).toBe(false);
      if (!result.ok && result.validationError) {
        expect(result.validationError.reason).toBe(
          'Workspace name contains invalid character "/"',
        );
      }
    });
  });

  describe('Additional Edge Cases (parity with helpers.spec.ts)', () => {
    it('should treat "ws:dir/subdir/" as a directory (trailing slash)', () => {
      const wsPath = WsPath.fromString('ws:dir/subdir/');
      expect(wsPath.isDir).toBe(true);
      expect(wsPath.isFile).toBe(false);
      expect(wsPath.path).toBe('dir/subdir/');
      expect(wsPath.extension).toBeUndefined();
    });

    it('should treat "ws:file.md/" as a directory (trailing slash)', () => {
      const wsPath = WsPath.fromString('ws:file.md/');
      expect(wsPath.isDir).toBe(true);
      expect(wsPath.isFile).toBe(false);
      expect(wsPath.path).toBe('file.md/');
      expect(wsPath.extension).toBeUndefined();
    });

    it('should treat "ws:myDir" as a directory', () => {
      const wsPath = WsPath.fromString('ws:myDir');
      expect(wsPath.isDir).toBe(true);
      expect(wsPath.isFile).toBe(false);
      expect(wsPath.path).toBe('myDir/');
      expect(wsPath.extension).toBeUndefined();
    });

    it('should reject path with double slash in the middle', () => {
      const result = WsPath.safeParse('ws:dir//file.txt');
      expect(result.ok).toBe(false);
      if (!result.ok && result.validationError) {
        expect(result.validationError.reason).toMatch(/Contains consecutive/);
      }
    });

    it('should reject path with double slash at start', () => {
      const result = WsPath.safeParse('ws://file.txt');
      expect(result.ok).toBe(false);
      if (!result.ok && result.validationError) {
        expect(result.validationError.reason).toEqual(
          'Invalid wsPath: File path cannot start with a forward slash (/)',
        );
      }
    });

    it('should parse "ws:   " as a directory with a purely whitespace path', () => {
      const wsPath = WsPath.fromString('ws:   ');
      expect(wsPath.isDir).toBe(true);
      expect(wsPath.path).toBe('');
    });

    it('should handle colon in the path after the first colon', () => {
      const wsPath = WsPath.fromString('ws:dir:subdir:file.txt');
      expect(wsPath.wsName).toBe('ws');
      expect(wsPath.path).toBe('dir:subdir:file.txt');
      expect(wsPath.isFile).toBe(true);
    });

    it('should reject file path that starts with slash (like ws:/abs/path)', () => {
      const result = WsPath.safeParse('ws:/abs/path');
      expect(result.ok).toBe(false);
      if (!result.ok && result.validationError) {
        expect(result.validationError.reason).toBe(
          'Invalid wsPath: File path cannot start with a forward slash (/)',
        );
      }
    });

    describe('toFSPath', () => {
      it('should convert valid wsPath to filesystem path', () => {
        expect(WsPath.fromString('ws:file.txt').toFSPath()).toBe('ws/file.txt');
        expect(WsPath.fromString('ws:dir/file.md').toFSPath()).toBe(
          'ws/dir/file.md',
        );
        expect(WsPath.fromString('ws:dir/').toFSPath()).toBe('ws/dir/');
        expect(WsPath.fromString('ws:dir').toFSPath()).toBe('ws/dir/');
        expect(WsPath.fromString('ws:').toFSPath()).toBe('ws/');
      });

      it('should handle paths with special characters', () => {
        const wsPath = WsPath.fromString('ws@123:dir/file@#$.txt');
        expect(wsPath.toFSPath()).toBe('ws@123/dir/file@#$.txt');
      });

      it('should handle paths with colons after workspace name', () => {
        const wsPath = WsPath.fromString('ws:dir:subdir:file.txt');
        expect(wsPath.toFSPath()).toBe('ws/dir:subdir:file.txt');
      });
    });

    describe('fromFSPath', () => {
      it('should convert valid filesystem path to wsPath', () => {
        expect(WsPath.fromFSPath('ws/file.txt')?.wsPath).toBe('ws:file.txt');
        expect(WsPath.fromFSPath('ws/dir/file.md')?.wsPath).toBe(
          'ws:dir/file.md',
        );
        expect(WsPath.fromFSPath('ws/')?.wsPath).toBe('ws:');
      });

      it('should return undefined for invalid filesystem path', () => {
        expect(WsPath.fromFSPath('')).toBeUndefined();
        expect(WsPath.fromFSPath('/')).toBeUndefined();
        expect(WsPath.fromFSPath('ws:file.txt')).toBeUndefined();
      });

      it('should handle paths with multiple slashes', () => {
        expect(WsPath.fromFSPath('ws/dir/subdir/file.txt')?.wsPath).toBe(
          'ws:dir/subdir/file.txt',
        );
      });
    });

    it('should treat "ws:" as a top-level directory', () => {
      const wsPath = WsPath.fromString('ws:');
      expect(wsPath.isDir).toBe(true);
      expect(wsPath.path).toBe('');
    });

    it('should handle file name of "." or ".." as a directory', () => {
      const result1 = WsPath.safeParse('ws:.');
      expect(result1.ok).toBe(false);
      if (!result1.ok && result1.validationError) {
        expect(result1.validationError.reason).toBe(
          'Invalid wsPath: Path cannot end with a dot (.)',
        );
      }

      const result2 = WsPath.safeParse('ws:..');
      expect(result2.ok).toBe(false);
      if (!result2.ok && result2.validationError) {
        expect(result2.validationError.reason).toBe(
          'Invalid wsPath: Path cannot end with a dot (.)',
        );
      }
    });

    it('should reject path with slash plus extra colon, e.g. "ws:/dir:"', () => {
      const result = WsPath.safeParse('ws:/dir:');
      expect(result.ok).toBe(false);
      if (!result.ok && result.validationError) {
        expect(result.validationError.reason).toBe(
          'Invalid wsPath: File path cannot start with a forward slash (/)',
        );
      }
    });
  });
});

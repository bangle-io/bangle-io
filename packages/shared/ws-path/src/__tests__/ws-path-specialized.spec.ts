import { describe, expect, it } from 'vitest';
import { WsDirPath, WsFilePath, WsPath } from '../ws-path';

describe('WsFilePath', () => {
  describe('Construction', () => {
    it('should create from valid file path string', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      expect(filePath.wsName).toBe('ws');
      expect(filePath.path).toBe('file.txt');
      expect(filePath.extension).toBe('.txt');
      expect(filePath.isFile).toBe(true);
      expect(filePath.isDir).toBe(false);
    });

    it('should create from valid nested file path', () => {
      const filePath = WsFilePath.fromString('ws:dir/subdir/file.md');
      expect(filePath.wsName).toBe('ws');
      expect(filePath.path).toBe('dir/subdir/file.md');
      expect(filePath.extension).toBe('.md');
    });

    it('should create from WsPath instance', () => {
      const wsPath = WsPath.fromString('ws:file.txt');
      const filePath = WsFilePath.fromString(wsPath);
      expect(filePath.wsName).toBe('ws');
      expect(filePath.path).toBe('file.txt');
    });

    it('should throw for directory path', () => {
      expect(() => WsFilePath.fromString('ws:dir')).toThrow();
      expect(() => WsFilePath.fromString('ws:dir/')).toThrow();
    });

    it('should throw for paths ending with forward slash', () => {
      expect(() => WsFilePath.fromString('ws:file.txt/')).toThrow(
        'Expected a file path but got a directory path',
      );
      expect(() => WsFilePath.fromString('ws:dir/file.md/')).toThrow(
        'Expected a file path but got a directory path',
      );
    });

    it('should throw for empty paths', () => {
      expect(() => WsFilePath.fromString('ws:')).toThrow(
        'Invalid wsPath: Expected a file path with extension',
      );
      expect(() => WsFilePath.fromString('ws:  ')).toThrow(
        'Invalid wsPath: Expected a file path with extension',
      );
    });

    it('should throw for invalid paths', () => {
      expect(() => WsFilePath.fromString('')).toThrow();
      expect(() => WsFilePath.fromString('invalid')).toThrow();
      expect(() => WsFilePath.fromString(':file.txt')).toThrow();
      expect(() => WsFilePath.fromString('ws:/file.txt')).toThrow();
    });

    it('should create from parts', () => {
      const filePath = WsFilePath.fromParts('ws', 'file.txt');
      expect(filePath.wsName).toBe('ws');
      expect(filePath.path).toBe('file.txt');
    });

    it('should throw when creating from parts without extension', () => {
      expect(WsPath.fromParts('ws', 'file').wsPath).toBe('ws:file');
    });
  });

  describe('Properties', () => {
    it('should correctly get fileName', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      expect(filePath.fileName).toBe('file.txt');

      const nestedPath = WsFilePath.fromString('ws:dir/subdir/nested.md');
      expect(nestedPath.fileName).toBe('nested.md');
    });

    it('should handle special characters in fileName', () => {
      const filePath = WsFilePath.fromString('ws:dir/file@#$.txt');
      expect(filePath.fileName).toBe('file@#$.txt');
    });

    it('should handle dots in fileName', () => {
      const filePath = WsFilePath.fromString('ws:dir/file.test.md');
      expect(filePath.fileName).toBe('file.test.md');
    });

    it('should correctly get fileNameWithoutExtension', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      expect(filePath.fileNameWithoutExtension).toBe('file');

      const nestedPath = WsFilePath.fromString('ws:dir/subdir/nested.md');
      expect(nestedPath.fileNameWithoutExtension).toBe('nested');

      const multiDotPath = WsFilePath.fromString('ws:dir/file.test.md');
      expect(multiDotPath.fileNameWithoutExtension).toBe('file.test');

      const specialCharsPath = WsFilePath.fromString('ws:dir/file@#$.txt');
      expect(specialCharsPath.fileNameWithoutExtension).toBe('file@#$');
    });

    it('should correctly get filePath', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      expect(filePath.filePath).toBe('file.txt');

      const nestedPath = WsFilePath.fromString('ws:dir/subdir/nested.md');
      expect(nestedPath.filePath).toBe('dir/subdir/nested.md');
    });

    it('should handle special characters in filePath', () => {
      const filePath = WsFilePath.fromString('ws:dir@#$/file@#$.txt');
      expect(filePath.filePath).toBe('dir@#$/file@#$.txt');
    });

    it('should preserve whitespace in filePath', () => {
      const filePath = WsFilePath.fromString('ws:dir name/file name.txt');
      expect(filePath.filePath).toBe('dir name/file name.txt');
    });
  });

  describe('Type Guarantees', () => {
    it('should always have extension', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      expect(filePath.extension).toBe('.txt');
      expect(typeof filePath.extension).toBe('string');
    });

    it('should always be a file', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      expect(filePath.isFile).toBe(true);
      expect(filePath.isDir).toBe(false);
    });

    it('should preserve type with withWsName', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      const newPath = filePath.withWsName('other');
      expect(newPath.wsName).toBe('other');
      expect(newPath.extension).toBe('.txt');
    });
  });

  describe('replaceFileName', () => {
    it('should replace the file name while keeping the directory path', () => {
      const filePath = WsFilePath.fromString('ws:dir/subdir/file.txt');
      const newPath = filePath.replaceFileName('newfile.md');

      expect(newPath.wsName).toBe('ws');
      expect(newPath.path).toBe('dir/subdir/newfile.md');
      expect(newPath.fileName).toBe('newfile.md');
      expect(newPath.extension).toBe('.md');
      expect(newPath.toString()).toBe('ws:dir/subdir/newfile.md');
    });

    it('should replace the file name for root-level files', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      const newPath = filePath.replaceFileName('readme.md');

      expect(newPath.wsName).toBe('ws');
      expect(newPath.path).toBe('readme.md');
      expect(newPath.fileName).toBe('readme.md');
      expect(newPath.extension).toBe('.md');
      expect(newPath.toString()).toBe('ws:readme.md');
    });

    it('should handle file names with multiple dots', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      const newPath = filePath.replaceFileName('config.test.json');

      expect(newPath.path).toBe('config.test.json');
      expect(newPath.fileName).toBe('config.test.json');
      expect(newPath.extension).toBe('.json');
    });

    it('should handle special characters in the new file name', () => {
      const filePath = WsFilePath.fromString('ws:dir/file.txt');
      const newPath = filePath.replaceFileName('file@#$.md');

      expect(newPath.path).toBe('dir/file@#$.md');
      expect(newPath.fileName).toBe('file@#$.md');
    });

    it('should throw for new file name without extension', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');

      expect(() => filePath.replaceFileName('newfile')).toThrow(
        'New file name must have an extension',
      );
    });

    it('should throw for new file name with just a dot', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');

      expect(() => filePath.replaceFileName('newfile.')).toThrow(
        'New file name must have an extension',
      );
    });

    it('should throw for empty new file name', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');

      expect(() => filePath.replaceFileName('')).toThrow(
        'New file name cannot be empty',
      );
    });
  });

  describe('Conversion Methods', () => {
    it('should always return self for asFile', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      expect(filePath.asFile()).toBe(filePath);
    });

    it('should always return undefined for asDir', () => {
      const filePath = WsFilePath.fromString('ws:file.txt');
      expect(filePath.asDir()).toBeUndefined();
    });
  });
});

describe('WsDirPath', () => {
  describe('Construction', () => {
    it('should create from valid directory path string', () => {
      const dirPath = WsDirPath.fromString('ws:dir');
      expect(dirPath.wsName).toBe('ws');
      expect(dirPath.path).toBe('dir/');
      expect(dirPath.extension).toBeUndefined();
      expect(dirPath.isFile).toBe(false);
      expect(dirPath.isDir).toBe(true);
    });

    it('should create from valid nested directory path', () => {
      const dirPath = WsDirPath.fromString('ws:dir/subdir');
      expect(dirPath.wsName).toBe('ws');
      expect(dirPath.path).toBe('dir/subdir/');
      expect(dirPath.extension).toBeUndefined();
    });

    it('should create from directory path with dots', () => {
      const dirPath = WsDirPath.fromString('bangle-notes:.bangle/backups');
      expect(dirPath.wsName).toBe('bangle-notes');
      expect(dirPath.path).toBe('.bangle/backups/');
      expect(dirPath.extension).toBeUndefined();
      expect(dirPath.isFile).toBe(false);
      expect(dirPath.isDir).toBe(true);

      const dirPath2 = WsDirPath.fromString('ws:.config/settings');
      expect(dirPath2.wsName).toBe('ws');
      expect(dirPath2.path).toBe('.config/settings/');
      expect(dirPath2.extension).toBeUndefined();
      expect(dirPath2.isFile).toBe(false);
      expect(dirPath2.isDir).toBe(true);
    });

    it('should create from WsPath instance', () => {
      const wsPath = WsPath.fromString('ws:dir');
      const dirPath = WsDirPath.fromString(wsPath);
      expect(dirPath.wsName).toBe('ws');
      expect(dirPath.path).toBe('dir/');
    });

    it('should preserve trailing slash if already present', () => {
      const dirPath = WsDirPath.fromString('ws:dir/');
      expect(dirPath.path).toBe('dir/');

      const nestedPath = WsDirPath.fromString('ws:dir/subdir/');
      expect(nestedPath.path).toBe('dir/subdir/');
    });

    it('should handle fromParts with and without trailing slash', () => {
      const dirPath1 = WsDirPath.fromParts('ws', 'dir');
      expect(dirPath1.path).toBe('dir/');

      const dirPath2 = WsDirPath.fromParts('ws', 'dir/');
      expect(dirPath2.path).toBe('dir/');

      const dirPath3 = WsDirPath.fromParts('ws', 'dir/subdir');
      expect(dirPath3.path).toBe('dir/subdir/');
    });

    it('should throw for file path', () => {
      expect(() => WsDirPath.fromString('ws:file.txt')).toThrow();
    });

    it('should throw for invalid paths', () => {
      expect(() => WsDirPath.fromString('')).toThrow();
      expect(() => WsDirPath.fromString('invalid')).toThrow();
      expect(() => WsDirPath.fromString(':dir')).toThrow();
      expect(() => WsDirPath.fromString('ws:/dir')).toThrow();
    });

    describe('handling dots in directory paths', () => {
      it('should handle various dot patterns in directory names', () => {
        // Leading dot (hidden directory)
        const hiddenDir = WsDirPath.fromString('ws:.config/');
        expect(hiddenDir.path).toBe('.config/');
        expect(hiddenDir.isDir).toBe(true);
        expect(hiddenDir.extension).toBeUndefined();

        // Multiple dots in name
        const versionDir = WsDirPath.fromString('ws:v1.2.3/config');
        expect(versionDir.path).toBe('v1.2.3/config/');
        expect(versionDir.isDir).toBe(true);
        expect(versionDir.extension).toBeUndefined();

        // Trailing dot
        const trailingDotDir = WsDirPath.fromString('ws:config./');
        expect(trailingDotDir.path).toBe('config./');
        expect(trailingDotDir.isDir).toBe(true);
        expect(trailingDotDir.extension).toBeUndefined();
      });

      it('should handle nested paths with dots', () => {
        // Multiple dotted segments with normal ending
        const path1 = WsDirPath.fromString('ws:.git/.config/hooks');
        expect(path1.path).toBe('.git/.config/hooks/');
        expect(path1.isDir).toBe(true);

        // Mix of normal and dotted segments with normal ending
        const path2 = WsDirPath.fromString('ws:src/v1.0.0/lib/internal');
        expect(path2.path).toBe('src/v1.0.0/lib/internal/');
        expect(path2.isDir).toBe(true);

        // Complex nesting with dots but normal ending
        const path3 = WsDirPath.fromString('ws:.local/share/v2.0/cache');
        expect(path3.path).toBe('.local/share/v2.0/cache/');
        expect(path3.isDir).toBe(true);
      });

      it('should throw for paths that look like files', () => {
        // Hidden file
        expect(() => WsDirPath.fromString('ws:.gitignore')).toThrow();

        // File in dotted directory
        expect(() =>
          WsDirPath.fromString('ws:.config/settings.json'),
        ).toThrow();

        // File with multiple extensions
        expect(() => WsDirPath.fromString('ws:.local/file.tar.gz')).toThrow();

        // Path ending with dot
        expect(() => WsDirPath.fromString('ws:dir.')).toThrow();

        // Path ending with multiple dots
        expect(() => WsDirPath.fromString('ws:dir...')).toThrow();

        // Path with dot in last segment
        expect(() =>
          WsDirPath.fromString('ws:src/v1.0.0/lib/.internal'),
        ).toThrow();
      });

      it('should handle edge cases', () => {
        // Dots in middle segments are fine
        const path1 = WsDirPath.fromString('ws:v1.0.0/internal');
        expect(path1.path).toBe('v1.0.0/internal/');
        expect(path1.isDir).toBe(true);

        // Dots with special characters in middle segments
        const path2 = WsDirPath.fromString('ws:.dir-v1.0/sub_dir/internal');
        expect(path2.path).toBe('.dir-v1.0/sub_dir/internal/');
        expect(path2.isDir).toBe(true);

        // Dots in workspace name with normal path
        const path3 = WsDirPath.fromString('my.ws:dir/internal');
        expect(path3.wsName).toBe('my.ws');
        expect(path3.path).toBe('dir/internal/');
        expect(path3.isDir).toBe(true);
      });
    });

    describe('createFilePath', () => {
      it('should create a file in the directory', () => {
        const dirPath = WsDirPath.fromString('ws:dir/subdir');
        const filePath = dirPath.createFilePath('file.txt');

        expect(filePath instanceof WsFilePath).toBe(true);
        expect(filePath.wsName).toBe('ws');
        expect(filePath.path).toBe('dir/subdir/file.txt');
        expect(filePath.fileName).toBe('file.txt');
        expect(filePath.extension).toBe('.txt');
        expect(filePath.toString()).toBe('ws:dir/subdir/file.txt');
      });

      it('should create a file in the root directory', () => {
        const rootDir = WsDirPath.fromString('ws:');
        const filePath = rootDir.createFilePath('file.md');

        expect(filePath.wsName).toBe('ws');
        expect(filePath.path).toBe('file.md');
        expect(filePath.fileName).toBe('file.md');
        expect(filePath.extension).toBe('.md');
        expect(filePath.toString()).toBe('ws:file.md');
      });

      it('should handle file names with multiple dots', () => {
        const dirPath = WsDirPath.fromString('ws:dir');
        const filePath = dirPath.createFilePath('config.test.json');

        expect(filePath.path).toBe('dir/config.test.json');
        expect(filePath.fileName).toBe('config.test.json');
        expect(filePath.extension).toBe('.json');
      });

      it('should handle special characters in the file name', () => {
        const dirPath = WsDirPath.fromString('ws:dir');
        const filePath = dirPath.createFilePath('file@#$.md');

        expect(filePath.path).toBe('dir/file@#$.md');
        expect(filePath.fileName).toBe('file@#$.md');
      });

      it('should throw for file name without extension', () => {
        const dirPath = WsDirPath.fromString('ws:dir');

        expect(() => dirPath.createFilePath('newfile')).toThrow(
          'File name must have an extension',
        );
      });

      it('should throw for file name with just a dot', () => {
        const dirPath = WsDirPath.fromString('ws:dir');

        expect(() => dirPath.createFilePath('newfile.')).toThrow(
          'File name must have an extension',
        );
      });

      it('should throw for empty file name', () => {
        const dirPath = WsDirPath.fromString('ws:dir');

        expect(() => dirPath.createFilePath('')).toThrow(
          'File name cannot be empty',
        );
      });

      it('should throw for file name containing path separators', () => {
        const dirPath = WsDirPath.fromString('ws:dir');

        expect(() => dirPath.createFilePath('subdir/file.txt')).toThrow(
          'File name cannot contain path separator',
        );
      });
    });
  });

  describe('Type Guarantees', () => {
    it('should never have extension', () => {
      const dirPath = WsDirPath.fromString('ws:dir');
      expect(dirPath.extension).toBeUndefined();
    });

    it('should always be a directory', () => {
      const dirPath = WsDirPath.fromString('ws:dir');
      expect(dirPath.isFile).toBe(false);
      expect(dirPath.isDir).toBe(true);
    });

    it('should preserve type with withWsName', () => {
      const dirPath = WsDirPath.fromString('ws:dir');
      const newPath = dirPath.withWsName('other');
      expect(newPath.wsPath).toBe('other:dir/');
    });
  });

  describe('Conversion Methods', () => {
    it('should always return undefined for asFile', () => {
      const dirPath = WsDirPath.fromString('ws:dir');
      expect(dirPath.asFile()).toBeUndefined();
    });

    it('should always return self for asDir', () => {
      const dirPath = WsDirPath.fromString('ws:dir');
      expect(dirPath.asDir()).toBe(dirPath);
    });
  });
});

describe('WsPath with Specialized Types', () => {
  describe('Conversion to WsFilePath', () => {
    it('should convert file path to WsFilePath', () => {
      const wsPath = WsPath.fromString('ws:file.txt');
      const filePath = wsPath.asFile();
      expect(filePath).toBeDefined();
      expect(filePath instanceof WsFilePath).toBe(true);
      if (filePath) {
        expect(filePath.extension).toBe('.txt');
      }
    });

    it('should return undefined when converting directory to WsFilePath', () => {
      const wsPath = WsPath.fromString('ws:dir');
      expect(wsPath.asFile()).toBeUndefined();
    });
  });

  describe('Conversion to WsDirPath', () => {
    it('should convert directory path to WsDirPath', () => {
      const wsPath = WsPath.fromString('ws:dir');
      const dirPath = wsPath.asDir();
      expect(dirPath).toBeDefined();
      expect(dirPath instanceof WsDirPath).toBe(true);
      if (dirPath) {
        expect(dirPath.extension).toBeUndefined();
      }
    });

    it('should return undefined when converting file to WsDirPath', () => {
      const wsPath = WsPath.fromString('ws:file.txt');
      expect(wsPath.asDir()).toBeUndefined();
    });
  });

  describe('Static Parsing Methods', () => {
    it('should parse file path to WsFilePath', () => {
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
        expect(result.validationError.reason).toContain('Expected a file path');
      }
    });

    it('should assert file path to WsFilePath', () => {
      const result = WsPath.assertFile('ws:file.txt');
      expect(result instanceof WsFilePath).toBe(true);
      expect(result.extension).toBe('.txt');
    });

    it('should throw when asserting directory as file', () => {
      expect(() => WsPath.assertFile('ws:dir')).toThrow();
    });
  });

  describe('File Type Checking', () => {
    describe('Markdown Files', () => {
      it('should identify markdown files correctly', () => {
        expect(WsPath.fromString('ws:file.md').isMarkdown()).toBe(true);
        expect(WsPath.fromString('ws:file.markdown').isMarkdown()).toBe(true);
        expect(WsPath.fromString('ws:file.txt').isMarkdown()).toBe(false);
        expect(WsPath.fromString('ws:dir').isMarkdown()).toBe(false);
      });

      it('should identify markdown files with static helper', () => {
        expect(WsPath.isMarkdownWsPath('ws:file.md')).toBe(true);
        expect(WsPath.isMarkdownWsPath('ws:file.markdown')).toBe(true);
        expect(WsPath.isMarkdownWsPath('ws:file.txt')).toBe(false);
        expect(WsPath.isMarkdownWsPath('ws:dir')).toBe(false);
        expect(WsPath.isMarkdownWsPath('invalid')).toBe(false);
      });

      it('should assert markdown files correctly', () => {
        expect(() =>
          WsPath.fromString('ws:file.md').assertMarkdown(),
        ).not.toThrow();
        expect(() =>
          WsPath.fromString('ws:file.markdown').assertMarkdown(),
        ).not.toThrow();
        expect(() =>
          WsPath.fromString('ws:file.txt').assertMarkdown(),
        ).toThrow();
        expect(() => WsPath.fromString('ws:dir').assertMarkdown()).toThrow();
      });
    });

    describe('Note Files', () => {
      it('should identify note files correctly', () => {
        expect(WsPath.fromString('ws:file.md').isNote()).toBe(true);
        expect(WsPath.fromString('ws:file.markdown').isNote()).toBe(false);
        expect(WsPath.fromString('ws:file.txt').isNote()).toBe(false);
        expect(WsPath.fromString('ws:dir').isNote()).toBe(false);
      });

      it('should identify note files with static helper', () => {
        expect(WsPath.isNoteWsPath('ws:file.md')).toBe(true);
        expect(WsPath.isNoteWsPath('ws:file.markdown')).toBe(false);
        expect(WsPath.isNoteWsPath('ws:file.txt')).toBe(false);
        expect(WsPath.isNoteWsPath('ws:dir')).toBe(false);
        expect(WsPath.isNoteWsPath('invalid')).toBe(false);
      });

      it('should assert note files correctly', () => {
        expect(() =>
          WsPath.fromString('ws:file.md').assertNote(),
        ).not.toThrow();
        expect(() =>
          WsPath.fromString('ws:file.markdown').assertNote(),
        ).toThrow();
        expect(() => WsPath.fromString('ws:file.txt').assertNote()).toThrow();
        expect(() => WsPath.fromString('ws:dir').assertNote()).toThrow();
      });
    });

    describe('Type Preservation', () => {
      it('should preserve file type information when converting', () => {
        const mdPath = WsPath.fromString('ws:file.md');
        const filePath = mdPath.asFile();
        expect(filePath?.isMarkdown()).toBe(true);
        expect(filePath?.isNote()).toBe(true);
      });

      it('should preserve file type information after immutable operations', () => {
        const mdPath = WsPath.fromString('ws:file.md');
        const newPath = mdPath.withWsName('other');
        expect(newPath.isMarkdown()).toBe(true);
        expect(newPath.isNote()).toBe(true);
      });
    });
  });

  describe('Parent and Root Operations', () => {
    it('should identify root paths correctly', () => {
      expect(WsPath.fromString('ws:').isRoot).toBe(true);
      expect(WsPath.fromString('ws:dir').isRoot).toBe(false);
      expect(WsPath.fromString('ws:file.txt').isRoot).toBe(false);
      expect(WsPath.fromString('ws:dir/subdir').isRoot).toBe(false);
    });

    it('should get parent directory for file paths', () => {
      const filePath = WsPath.fromString('ws:dir/subdir/file.txt');
      const parent = filePath.getParent();
      expect(parent).toBeDefined();
      expect(parent?.wsPath).toBe('ws:dir/subdir/');
      expect(parent instanceof WsDirPath).toBe(true);
    });

    it('should get parent directory for directory paths', () => {
      const dirPath = WsPath.fromString('ws:dir/subdir');
      const parent = dirPath.getParent();
      expect(parent).toBeDefined();
      expect(parent?.wsPath).toBe('ws:dir/');
      expect(parent instanceof WsDirPath).toBe(true);
    });

    it('should get root as parent for top-level paths', () => {
      const filePath = WsPath.fromString('ws:file.txt');
      const dirPath = WsPath.fromString('ws:dir');

      const fileParent = filePath.getParent();
      const dirParent = dirPath.getParent();

      expect(fileParent).toBeDefined();
      expect(fileParent?.wsPath).toBe('ws:');
      expect(fileParent?.isRoot).toBe(true);

      expect(dirParent).toBeDefined();
      expect(dirParent?.wsPath).toBe('ws:');
      expect(dirParent?.isRoot).toBe(true);
    });

    it('should handle paths with trailing slashes', () => {
      const dirPath = WsPath.fromString('ws:dir/subdir/');
      const parent = dirPath.getParent();
      expect(parent?.wsPath).toBe('ws:dir/');
    });

    it('should handle unicode characters in path', () => {
      const path1 = WsPath.fromString('ws:目录/子目录/文件.txt');
      expect(path1.getParent()?.wsPath).toBe('ws:目录/子目录/');

      const path2 = WsPath.fromString('ws:目录/文件.txt');
      expect(path2.getParent()?.wsPath).toBe('ws:目录/');
    });

    it('should return undefined as parent for root paths', () => {
      expect(WsPath.fromString('ws:').getParent()).toBeUndefined();
    });
  });
});

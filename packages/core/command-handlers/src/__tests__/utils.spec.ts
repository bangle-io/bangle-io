import { describe, expect, it } from 'vitest';
import { validateInputPath } from '../utils';

const catchError = (fn: () => void): Error | undefined => {
  try {
    fn();
    return undefined;
  } catch (e) {
    if (e instanceof Error) {
      return e;
    }
    throw e;
  }
};

describe('validateInputPath', () => {
  it('should throw error for non-string input', () => {
    const error = catchError(() => validateInputPath(123));
    expect(error).toMatchObject({
      message: t.app.errors.wsPath.invalidNotePath,
    });
    expect(error?.cause).toMatchObject({
      isBangleAppError: true,
      name: 'error::ws-path:create-new-note',
      payload: { invalidWsPath: '123' },
    });
  });

  it('should throw error for invalid endings', () => {
    const invalidPaths = ['path/', 'path/.md', ''];
    invalidPaths.forEach((path) => {
      const error = catchError(() => validateInputPath(path));
      expect(error).toMatchObject({
        message: t.app.errors.wsPath.invalidNotePath,
      });
      expect(error?.cause).toMatchObject({
        isBangleAppError: true,
        name: 'error::ws-path:create-new-note',
        payload: { invalidWsPath: path },
      });
    });
  });

  it('should throw error for absolute paths', () => {
    const error = catchError(() => validateInputPath('/absolute/path'));
    expect(error).toMatchObject({
      message: t.app.errors.wsPath.absolutePathNotAllowed,
    });
    expect(error?.cause).toMatchObject({
      isBangleAppError: true,
      name: 'error::ws-path:create-new-note',
      payload: { invalidWsPath: '/absolute/path' },
    });
  });

  it('should throw error for windows-style drive-letter paths (invalid characters)', () => {
    // Backslash and ":" are not meaningful path syntax in wsPath (which is
    // forward-slash only), so these are rejected as invalid characters
    // rather than as a distinct "absolute path" category.
    const path = 'C:\\absolute\\path';
    const error = catchError(() => validateInputPath(path));
    expect(error).toMatchObject({
      message: t.app.errors.wsPath.invalidCharsInPath,
    });
    expect(error?.cause).toMatchObject({
      isBangleAppError: true,
      name: 'error::ws-path:create-new-note',
      payload: { invalidWsPath: path },
    });
  });

  it('should throw error for directory traversal', () => {
    const error = catchError(() => validateInputPath('../path'));
    expect(error).toMatchObject({
      message: t.app.errors.wsPath.directoryTraversalNotAllowed,
    });
    expect(error?.cause).toMatchObject({
      isBangleAppError: true,
      name: 'error::ws-path:create-new-note',
      payload: { invalidWsPath: '../path' },
    });
  });

  it('should throw error for backslash-style traversal (invalid characters)', () => {
    // "\\" is not a recognized path separator in wsPath, so this is
    // rejected as an invalid character rather than as traversal.
    const path = '..\\path';
    const error = catchError(() => validateInputPath(path));
    expect(error).toMatchObject({
      message: t.app.errors.wsPath.invalidCharsInPath,
    });
    expect(error?.cause).toMatchObject({
      isBangleAppError: true,
      name: 'error::ws-path:create-new-note',
      payload: { invalidWsPath: path },
    });
  });

  it('should throw error for consecutive forward slashes', () => {
    const path = 'path//to/note';
    const error = catchError(() => validateInputPath(path));
    expect(error).toMatchObject({
      message: t.app.errors.wsPath.invalidNotePath,
    });
    expect(error?.cause).toMatchObject({
      isBangleAppError: true,
      name: 'error::ws-path:create-new-note',
      payload: { invalidWsPath: path },
    });
  });

  it('should throw error for path segments that are "." or ".."', () => {
    const path = 'path/./note';
    const error = catchError(() => validateInputPath(path));
    expect(error).toMatchObject({
      message: t.app.errors.wsPath.directoryTraversalNotAllowed,
    });
    expect(error?.cause).toMatchObject({
      isBangleAppError: true,
      name: 'error::ws-path:create-new-note',
      payload: { invalidWsPath: path },
    });
  });

  it('should throw error for invalid characters', () => {
    const invalidCharPaths = [
      'path<',
      'path>',
      'path:',
      'path"',
      'path\\',
      'path|',
      'path?',
      'path*',
    ];
    invalidCharPaths.forEach((path) => {
      const error = catchError(() => validateInputPath(path));
      expect(error).toMatchObject({
        message: t.app.errors.wsPath.invalidCharsInPath,
      });
      expect(error?.cause).toMatchObject({
        isBangleAppError: true,
        name: 'error::ws-path:create-new-note',
        payload: { invalidWsPath: path },
      });
    });
  });

  it('should throw error for a path ending with a dot', () => {
    const path = 'path/note.';
    const error = catchError(() => validateInputPath(path));
    expect(error).toMatchObject({
      message: t.app.errors.wsPath.invalidNotePath,
    });
    expect(error?.cause).toMatchObject({
      isBangleAppError: true,
      name: 'error::ws-path:create-new-note',
      payload: { invalidWsPath: path },
    });
  });

  it('should throw error for path exceeding maximum length', () => {
    const longPath = 'a'.repeat(256);
    const error = catchError(() => validateInputPath(longPath));
    expect(error).toMatchObject({
      message: t.app.errors.wsPath.pathTooLong,
    });
    expect(error?.cause).toMatchObject({
      isBangleAppError: true,
      name: 'error::ws-path:create-new-note',
      payload: { invalidWsPath: longPath },
    });
  });

  it('should not throw error for valid path', () => {
    const validPath = 'valid/path';
    const error = catchError(() => validateInputPath(validPath));
    expect(error).toBeUndefined();
  });
});

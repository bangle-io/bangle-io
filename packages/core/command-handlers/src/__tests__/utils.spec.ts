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
    const absolutePaths = ['/absolute/path', 'C:\\absolute\\path'];
    absolutePaths.forEach((path) => {
      const error = catchError(() => validateInputPath(path));
      expect(error).toMatchObject({
        message: t.app.errors.wsPath.absolutePathNotAllowed,
      });
      expect(error?.cause).toMatchObject({
        isBangleAppError: true,
        name: 'error::ws-path:create-new-note',
        payload: { invalidWsPath: path },
      });
    });
  });

  it('should throw error for directory traversal', () => {
    const traversalPaths = ['../path', '..\\path'];
    traversalPaths.forEach((path) => {
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

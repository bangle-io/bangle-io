import { NATIVE_FS_ERROR_CODE, NativeFsError } from './errors';

/**
 * Paths in this package are always relative to the root directory handle:
 * `"notes/todo.md"`, never `"/notes/todo.md"` and never prefixed with the
 * root directory's own name. `""` refers to the root directory itself and is
 * only valid where a directory is expected.
 */
export function splitPath(path: string): string[] {
  if (path === '') {
    return [];
  }
  const segments = path.split('/');
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') {
      throw new NativeFsError({
        message: `Invalid path "${path}": empty, "." or ".." segments are not allowed`,
        code: NATIVE_FS_ERROR_CODE.invalidPath,
      });
    }
    if (segment.includes('\\')) {
      throw new NativeFsError({
        message: `Invalid path "${path}": "\\" is not a valid path separator`,
        code: NATIVE_FS_ERROR_CODE.invalidPath,
      });
    }
  }
  return segments;
}

/** Like {@link splitPath} but additionally rejects the empty (root) path. */
export function splitFilePath(path: string): string[] {
  const segments = splitPath(path);
  if (segments.length === 0) {
    throw new NativeFsError({
      message: 'Invalid file path: a file path cannot be empty',
      code: NATIVE_FS_ERROR_CODE.invalidPath,
    });
  }
  return segments;
}

export function joinPath(segments: readonly string[]): string {
  return segments.join('/');
}

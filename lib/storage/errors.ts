import {
  BaseFileSystemError,
  IndexedDBFileSystemError,
} from '@bangle.io/baby-fs';

export {
  FILE_ALREADY_EXISTS_ERROR,
  FILE_NOT_FOUND_ERROR,
  NOT_ALLOWED_ERROR,
  UPSTREAM_ERROR,
} from '@bangle.io/baby-fs';

export function isIndexedDbException(error: Error) {
  return (
    error.name === BaseFileSystemError.name ||
    error.name === IndexedDBFileSystemError.name
  );
}

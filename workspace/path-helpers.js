import { BaseError } from 'utils/base-error';

const last = (arr) => arr[arr.length - 1];
export class PathValidationError extends BaseError {}

export function validWsName(wsName) {
  if (wsName.includes(':')) {
    throw new PathValidationError(
      'Invalid wsName "' + wsName + '" .',
      undefined,
      'Please avoid using special characters',
    );
  }
}

export const NOTE_WS_PATH_EXTENSION = /.+\.md$/;

export function validateWsPath(wsPath) {
  if (wsPath.split('/').some((r) => r.length === 0)) {
    throw new PathValidationError(
      'Invalid path ' + wsPath,
      undefined,
      'The file path is not valid.',
    );
  }

  const [wsName, filePath, ...others] = wsPath.split(':');

  if (others.length > 0) {
    throw new PathValidationError(
      'Semicolon allowed',
      undefined,
      'Your file path cannot contain `:` (semicolon)',
    );
  }

  if (!wsName || !filePath) {
    throw new PathValidationError(
      'Invalid wsPath ' + wsPath,
      undefined,
      'You provided any empty file path',
    );
  }
}

// a file wsPath is workspace path to a file
export function validateFileWsPath(wsPath) {
  validateWsPath(wsPath);
  const { fileName } = resolvePath(wsPath);
  if (!fileName.includes('.')) {
    throw new PathValidationError(
      `Filename ${fileName} must have "." extension.`,
      undefined,
    );
  }
}

// a note wsPath is every what a file wsPath is
// but restricted to only .md for now
export function validateNoteWsPath(wsPath) {
  validateFileWsPath(wsPath);
  if (!isValidNoteWsPath(wsPath)) {
    throw new PathValidationError('Notes can only be saved in .md format');
  }
}

export function isValidNoteWsPath(wsPath) {
  return NOTE_WS_PATH_EXTENSION.test(wsPath);
}

export function resolvePath(wsPath) {
  validateWsPath(wsPath);
  const [wsName, filePath] = wsPath.split(':');
  const fileName = last(filePath.split('/'));

  return {
    wsName,
    filePath,
    fileName: fileName,
    locationPath: '/ws/' + wsName + '/' + filePath,
  };
}

export function filePathToWsPath(wsName, filePath) {
  return wsName + ':' + filePath;
}

export function locationToFilePath(location) {
  if (location) {
    return location.pathname.split('/').slice(3).join('/');
  }
  return null;
}

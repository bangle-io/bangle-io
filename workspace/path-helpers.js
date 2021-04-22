import { BaseError } from 'utils/base-error';

const pathValidRegex = /^[0-9a-zA-Z_\-. /:=',()–!\+\[\]]+$/;
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

export function validatePath(wsPath) {
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

  if (filePath.endsWith('/.md')) {
    throw new PathValidationError(
      'Invalid wsPath ' + wsPath,
      undefined,
      'File name cannot be empty',
    );
  }

  if (filePath === '.md') {
    throw new PathValidationError(
      'Invalid wsPath ' + wsPath,
      undefined,
      'File name must end with .md',
    );
  }
}

export function validateWsFilePath(wsPath) {
  validatePath(wsPath);
  const { fileName } = resolvePath(wsPath);
  if (!fileName.includes('.')) {
    throw new PathValidationError(
      `Filename ${fileName} must have "." extension.`,
      undefined,
    );
  }
}

export function resolvePath(wsPath) {
  validatePath(wsPath);
  const [wsName, filePath] = wsPath.split(':');
  const fileName = last(filePath.split('/'));

  return {
    wsName,
    filePath,
    fileName: fileName,
    locationPath: '/ws/' + wsName + '/' + filePath,
  };
}

export function locationToFilePath(location) {
  if (location) {
    return location.pathname.split('/').slice(3).join('/');
  }
  return null;
}

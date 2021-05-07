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

export function isWsPath(wsPath) {
  if (!wsPath || typeof wsPath !== 'string') {
    return false;
  }
  if (wsPath.split(':').length !== 2) {
    return false;
  }
  return true;
}

export function isValidFileWsPath(wsPath) {
  if (!isWsPath(wsPath)) {
    return false;
  }

  const items = wsPath.split('/');
  if (items[items.length - 1]?.includes('.')) {
    return true;
  }

  return false;
}

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
  if (!isValidFileWsPath(wsPath)) {
    throw new PathValidationError('Invalid path ' + wsPath);
  }

  validateWsPath(wsPath);
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

// TODO rename this to resolveWsPath
// TODO add test where wsPath has `//`
export function resolvePath(wsPath) {
  validateWsPath(wsPath);
  const [wsName, filePath] = wsPath.split(':');
  const filePathSplitted = filePath.split('/');
  const fileName = last(filePathSplitted);

  const dirPath = filePathSplitted
    .slice(0, filePathSplitted.length - 1)
    .filter(Boolean)
    .join('/');
  return {
    wsName,
    filePath, // wsName:filePath
    dirPath, // wsName:dirPath/fileName
    fileName,
    locationPath: '/ws/' + wsName + '/' + filePath,
  };
}

export function filePathToWsPath(wsName, filePath) {
  if (filePath.startsWith('/')) {
    filePath = filePath.slice(1);
  }
  return wsName + ':' + filePath;
}

export function locationToFilePath(location) {
  if (location) {
    return location.pathname.split('/').slice(3).join('/');
  }
  return null;
}

export function sanitizeFilePath(filePath) {
  return filePath.replace(/[^\w\s-\.]/g, '');
}

/**
 * The local file paths are the paths supported by the file system.
 * For example ./my-file is a relative file.
 * @param {String} filePath - The file path read directly form the user input like an md file
 * @param {String} wsPath - the current file wsPath to resolve the relative path from
 * @returns {String} a valid wsPath to it
 */
export function parseLocalFilePath(filePath, wsPath) {
  if (filePath.startsWith('./')) {
    filePath = filePath.slice(2);
  }
  const { wsName, dirPath } = resolvePath(wsPath);
  let sampleDomain = 'https://bangle.io';
  if (dirPath) {
    sampleDomain += '/' + dirPath + '/';
  }
  let webPath = new URL(filePath, sampleDomain).pathname;

  if (webPath.startsWith('/')) {
    webPath = webPath.slice(1);
  }
  // need to decode uri as filesystems dont do encoding
  return filePathToWsPath(wsName, decodeURIComponent(webPath));
}

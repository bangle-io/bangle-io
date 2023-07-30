import { BaseError } from '@bangle.io/base-error';
import { getLast } from '@bangle.io/mini-js-utils';
import type { WsName, WsPath } from '@bangle.io/shared-types';

export const DEFAULT_NOTE_EXTENSION = '.md';
export const VALID_NOTE_EXTENSIONS = [DEFAULT_NOTE_EXTENSION];

// works on any string
export function hasValidNoteExtension(str: string) {
  return VALID_NOTE_EXTENSIONS.some((ext) => str.endsWith(ext));
}

export function createWsName(wsName: string): WsName {
  validWsName(wsName);

  return wsName as WsName;
}

export function createWsPath(wsPath: string, validate = true): WsPath {
  if (validate) {
    validateWsPath(wsPath);
  }

  return wsPath as WsPath;
}

export function getExtension(str: string) {
  if (str.includes('/')) {
    str = str.slice(str.lastIndexOf('/') + 1);
  }

  const dotIndex = str.lastIndexOf('.');

  return dotIndex === -1 ? undefined : str.slice(dotIndex);
}

function conditionalSuffix(str: string, part: string) {
  if (str.endsWith(part)) {
    return str;
  }

  return str + part;
}

export function suffixWithNoteExtension(str: string) {
  return conditionalSuffix(str, DEFAULT_NOTE_EXTENSION);
}

export function removeExtension(str: string) {
  const dotIndex = str.lastIndexOf('.');

  return dotIndex === -1 ? str : str.slice(0, dotIndex);
}

export type MaybeWsPath = string | undefined;

/**
 * Types of paths
 * filePath - /a/b/c.md simple file path
 * wsPath - <wsName>:<filePath>
 * fsPath - /<wsName>/<filePath> - this is what is used internally by the fs module
 */
// TODO add test where wsPath has `//`
export function resolvePath(wsPath: string, skipValidation = false) {
  if (!skipValidation) {
    validateWsPath(wsPath);
    // TODO currently this only works for fileWsPaths
    validateFileWsPath(wsPath);
  }
  const [wsName, filePath] = splitWsPath(wsPath);
  const filePathSplitted = filePath.split('/');
  const fileName: string | undefined = getLast(filePathSplitted);

  if (typeof fileName !== 'string') {
    throw new Error('fileName undefined');
  }
  const dirPath = filePathSplitted
    .slice(0, filePathSplitted.length - 1)
    .filter(Boolean)
    .join('/');

  return {
    wsPath,
    wsName,
    filePath, // wsName:filePath
    dirPath, // wsName:dirPath/fileName
    fileName,
    fileNameWithoutExt: removeExtension(fileName),
  };
}

export function resolvePath2(wsPath: WsPath): {
  wsName: WsName;
  fileName: string;
  filePath: string;
  dirPath: string;
  fileNameWithoutExt: string;
} {
  const { wsName, fileName, filePath, dirPath, fileNameWithoutExt } =
    resolvePath(wsPath, true);

  return {
    wsName: createWsName(wsName),
    fileName,
    filePath,
    dirPath,
    fileNameWithoutExt,
  };
}

export class PathValidationError extends BaseError {}

export function isValidWsName(wsName: string | undefined): boolean {
  if (!wsName) {
    return false;
  }
  if (wsName.includes(':')) {
    return false;
  }

  return true;
}

export function validWsName(wsName: string) {
  if (wsName === '') {
    throw new PathValidationError({
      message: 'Invalid wsName "' + wsName + '" .',
    });
  }
  if (wsName.includes(':')) {
    throw new PathValidationError({
      message: 'Invalid characters in  "' + wsName + '" .',
    });
  }
}

export function isWsPath(wsPath: string) {
  if (!wsPath || typeof wsPath !== 'string') {
    return false;
  }

  if (wsPath.split('/').some((r) => r.length === 0)) {
    return false;
  }

  const [wsName, filePath, ...others] = wsPath.split(':');

  if (others.length > 0) {
    return false;
  }

  if (!wsName || !filePath) {
    return false;
  }

  return true;
}

export function isValidFileWsPath(wsPath: string) {
  if (!isWsPath(wsPath)) {
    return false;
  }

  const items = wsPath.split('/');

  if (items[items.length - 1]?.includes('.')) {
    return true;
  }

  return false;
}

export function validateWsPath(wsPath: string) {
  if (wsPath.split('/').some((r) => r.length === 0)) {
    throw new PathValidationError({ message: 'Invalid path ' + wsPath });
  }

  const [wsName, filePath, ...others] = wsPath.split(':');

  if (others.length > 0) {
    throw new PathValidationError({
      message: 'Semicolon not allowed file path',
    });
  }

  if (!isWsPath(wsPath)) {
    throw new PathValidationError({ message: 'Invalid wsPath ' + wsPath });
  }
}

// a file wsPath is workspace path to a file
export function validateFileWsPath(wsPath: string) {
  if (!isValidFileWsPath(wsPath)) {
    throw new PathValidationError({ message: 'Invalid wsPath ' + wsPath });
  }

  validateWsPath(wsPath);
}

// a note wsPath is any wsPath that is a note i.e. ends with VALID_NOTE_EXTENSIONS
export function validateNoteWsPath(wsPath: string) {
  validateFileWsPath(wsPath);

  if (!isValidNoteWsPath(wsPath)) {
    throw new PathValidationError({
      message: `Bangle.io support the following file extensions for notes: ${VALID_NOTE_EXTENSIONS.join(
        ', ',
      )}`,
    });
  }
}

export function isValidNoteWsPath(wsPath: string | undefined) {
  return wsPath ? hasValidNoteExtension(wsPath) : false;
}

export function sanitizeFilePath(filePath: string) {
  return filePath.replace(/[^\w\s-\.]/g, '');
}

/**
 * The local file paths are the paths supported by the file system.
 * For example ./my-file is a relative file.
 * @param {String} filePath - The file path read directly form the user input like an md file
 * @param {String} wsPath - the current file wsPath to resolve the relative path from
 * @returns {String} a valid wsPath to it
 */
export function parseLocalFilePath(filePath: string, wsPath: WsPath): WsPath {
  if (filePath.includes(':')) {
    throw new PathValidationError({
      message: 'Invalid character ":" in  "' + filePath + '" .',
    });
  }

  if (filePath.startsWith('./')) {
    filePath = filePath.slice(2);
  }
  const { wsName, dirPath } = resolvePath2(wsPath);
  let sampleDomain = 'https://bangle.io';

  if (dirPath) {
    sampleDomain += '/' + dirPath + '/';
  }
  let webPath = new URL(filePath, sampleDomain).pathname;

  if (webPath.startsWith('/')) {
    webPath = webPath.slice(1);
  }

  // need to decode uri as filesystems dont do encoding
  return filePathToWsPath2(wsName, decodeURIComponent(webPath));
}

export function parseLocalFilePath2(filePath: string, wsPath: WsPath): WsPath {
  return createWsPath(parseLocalFilePath(filePath, wsPath));
}

export const toFSPath = (wsPath: string) => {
  const { wsName, filePath } = resolvePath(wsPath);

  return [wsName, filePath].join('/');
};

export function fromFsPath(fsPath: string) {
  const [_wsName, ...f] = fsPath.split('/');

  if (!_wsName || _wsName.includes(':')) {
    return undefined;
  }

  return filePathToWsPath(_wsName, f.join('/'));
}

export function splitWsPath(wsPath: string): [string, string] {
  const [wsName, filePath] = wsPath.split(':');

  if (!wsName) {
    throw new PathValidationError({ message: 'Invalid wsName' });
  }

  if (!filePath) {
    throw new PathValidationError({ message: 'Invalid filePath' });
  }

  return [wsName, filePath];
}

export function updateFileName2(wsPath: WsPath, newFileName: string): WsPath {
  const { wsName, dirPath } = resolvePath2(wsPath);

  return filePathToWsPath2(wsName, `${dirPath}/${newFileName}`);
}

export function filePathToWsPath(wsName: string, filePath: string) {
  if (filePath.startsWith('/')) {
    filePath = filePath.slice(1);
  }

  return wsName + ':' + filePath;
}

export function filePathToWsPath2(wsName: WsName, filePath: string): WsPath {
  if (filePath.startsWith('/')) {
    filePath = filePath.slice(1);
  }

  return createWsPath(wsName + ':' + filePath);
}

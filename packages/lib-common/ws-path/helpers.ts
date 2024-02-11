import { APP_ERROR_NAME, throwAppError } from '@bangle.io/app-errors';
import { getLast } from '@bangle.io/mini-js-utils';
type WsPath = string;
type WsName = string;

export const DEFAULT_NOTE_EXTENSION = '.md';
export const VALID_NOTE_EXTENSIONS = [DEFAULT_NOTE_EXTENSION];
export const VALID_NOTE_EXTENSIONS_SET = new Set(VALID_NOTE_EXTENSIONS);

// works on any string
export function hasValidNoteExtension(str: string) {
  return VALID_NOTE_EXTENSIONS.some((ext) => str.endsWith(ext));
}

export function createWsName(wsName: string): WsName {
  validWsName(wsName);
  return wsName;
}

export function createWsPath(wsPath: string, validate = true): WsPath {
  if (validate) {
    validateWsPath(wsPath);
  }
  return wsPath;
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
export function resolvePath(wsPath: string, skipValidation = true) {
  if (!skipValidation) {
    validateWsPath(wsPath);
    validateFileWsPath(wsPath);
  }
  const [wsName, filePath] = splitWsPath(wsPath);
  const filePathSplitted = filePath.split('/');
  const fileName: string | undefined = getLast(filePathSplitted);

  if (typeof fileName !== 'string') {
    throwAppError(APP_ERROR_NAME.wsPathValidation, 'fileName undefined', {
      invalidPath: '',
    });
  }

  const dirPath = filePathSplitted.slice(0, -1).filter(Boolean).join('/');

  return {
    wsPath,
    wsName,
    filePath, // wsName:filePath
    dirPath, // wsName:dirPath/fileName
    fileName,
    fileNameWithoutExt: removeExtension(fileName),
  };
}

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
    throwAppError(
      APP_ERROR_NAME.wsPathValidation,
      'Invalid wsName "' + wsName + '" .',
      {
        invalidPath: wsName,
      },
    );
  }
  if (wsName.includes(':')) {
    throwAppError(
      APP_ERROR_NAME.wsPathValidation,
      'Invalid characters in "' + wsName + '" .',
      {
        invalidPath: wsName,
      },
    );
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
    throwAppError(APP_ERROR_NAME.wsPathValidation, 'Invalid path ' + wsPath, {
      invalidPath: wsPath,
    });
  }
  const [wsName, filePath, ...others] = wsPath.split(':');
  if (others.length > 0) {
    throwAppError(
      APP_ERROR_NAME.wsPathValidation,
      'Semicolon not allowed in file path',
      {
        invalidPath: wsPath,
      },
    );
  }
  if (!isWsPath(wsPath)) {
    throwAppError(APP_ERROR_NAME.wsPathValidation, 'Invalid wsPath ' + wsPath, {
      invalidPath: wsPath,
    });
  }
}

export function validateFileWsPath(wsPath: string) {
  if (!isValidFileWsPath(wsPath)) {
    throwAppError(APP_ERROR_NAME.wsPathValidation, 'Invalid wsPath ' + wsPath, {
      invalidPath: wsPath,
    });
  }
  validateWsPath(wsPath);
}

export function validateNoteWsPath(wsPath: string) {
  validateFileWsPath(wsPath);
  if (!isValidNoteWsPath(wsPath)) {
    throwAppError(
      APP_ERROR_NAME.wsPathValidation,
      `Bangle.io supports the following file extensions for notes: ${VALID_NOTE_EXTENSIONS.join(
        ', ',
      )}`,
      {
        invalidPath: wsPath,
      },
    );
  }
}

export function isValidNoteWsPath(wsPath: string | undefined) {
  return wsPath ? hasValidNoteExtension(wsPath) : false;
}

export function sanitizeFilePath(filePath: string) {
  // eslint-disable-next-line no-useless-escape
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
    throwAppError(
      APP_ERROR_NAME.wsPathValidation,
      'Invalid character ":" in "' + filePath + '" .',
      {
        invalidPath: filePath,
      },
    );
  }

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
    throwAppError(APP_ERROR_NAME.wsPathValidation, 'Invalid wsName', {
      invalidPath: wsPath,
    });
  }
  if (!filePath) {
    throwAppError(APP_ERROR_NAME.wsPathValidation, 'Invalid filePath', {
      invalidPath: wsPath,
    });
  }
  return [wsName, filePath];
}

export function filePathToWsPath(wsName: string, filePath: string) {
  if (filePath.startsWith('/')) {
    filePath = filePath.slice(1);
  }
  return wsName + ':' + filePath;
}

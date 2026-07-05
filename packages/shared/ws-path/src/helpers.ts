import { throwAppError } from '@bangle.io/base-utils';
import {
  DEFAULT_NOTE_EXTENSION,
  PATH_SEPARATOR,
  VALID_MARKDOWN_EXTENSIONS_SET,
  VALID_NOTE_EXTENSIONS,
} from './constants';
import { validateWsName as validateWsNameShared } from './validation';

type ValidationResult =
  | { isValid: true; wsName: string; filePath: string }
  | { isValid: false; reason: string; invalidPath: string };

function breakPathIntoParts(path: string): string[] {
  return path.split(PATH_SEPARATOR);
}

// joins into path, will not remove leading or trailing slashes
// if '' empty string, it will be filtered out,
// will prevent having `//` in the joined path
export function pathJoin(...args: string[]): string {
  return args
    .filter((part) => part !== '')
    .map((part, index) => {
      if (index === 0) {
        // Remove trailing slashes from the first part
        return part.replace(/\/+$/, '');
      }
      // Remove leading and trailing slashes from subsequent parts
      return part.replace(/^\/+|\/+$/g, '');
    })
    .join(PATH_SEPARATOR);
}

function getExtension(strInput: string): string | undefined {
  let str = strInput;
  // if it is a wsPath remove the wsName
  if (str.includes(':')) {
    str = str.slice(str.indexOf(':') + 1);
  }

  if (str.includes('/')) {
    str = str.slice(str.lastIndexOf('/') + 1);
  }
  const dotIndex = str.lastIndexOf('.');
  return dotIndex === -1 ? undefined : str.slice(dotIndex);
}

// Delegates to the single source of truth in ./validation, adapting its
// { ok, data | validationError } shape to the local ValidationResult shape
// used by callers in this file.
function validateWsName(wsName: string): ValidationResult {
  const result = validateWsNameShared(wsName);
  if (!result.ok) {
    return {
      isValid: false,
      reason: result.validationError.reason,
      invalidPath: result.validationError.invalidPath,
    };
  }

  return { isValid: true, wsName: result.data, filePath: '' };
}

function validateWsPath(wsPath: string): ValidationResult {
  if (typeof wsPath !== 'string' || !wsPath) {
    return {
      isValid: false,
      reason: 'wsPath is not a string or is empty',
      invalidPath: wsPath,
    };
  }

  if (wsPath.includes('//')) {
    return {
      isValid: false,
      reason: 'Invalid path segment',
      invalidPath: wsPath,
    };
  }

  const colonIndex = wsPath.indexOf(':');

  if (colonIndex === -1) {
    return {
      isValid: false,
      reason: 'Missing : in wsPath',
      invalidPath: wsPath,
    };
  }

  const [wsName, filePath] = splitWsPath(wsPath);

  if (!wsName || filePath === undefined) {
    return {
      isValid: false,
      reason: 'wsName or filePath is missing',
      invalidPath: wsPath,
    };
  }

  if (filePath.startsWith('/')) {
    return {
      isValid: false,
      reason: 'filePath should not start with /',
      invalidPath: wsPath,
    };
  }

  const wsNameResult = validateWsName(wsName);

  if (!wsNameResult.isValid) {
    return wsNameResult;
  }

  return { isValid: true, wsName, filePath };
}

function assertSplitWsPath(wsPath: string): {
  wsName: string;
  filePath: string;
} {
  const validationResult = validateWsPath(wsPath);
  if (!validationResult.isValid) {
    throwAppError('error::ws-path:invalid-ws-path', validationResult.reason, {
      invalidPath: validationResult.invalidPath,
    });
  }
  return {
    wsName: validationResult.wsName,
    filePath: validationResult.filePath,
  };
}

// TODO resolveFileWsPath
function assertedResolvePath(wsPath: string) {
  const resolved = resolvePath(wsPath);
  if (!resolved) {
    throwAppError('error::ws-path:invalid-ws-path', 'Invalid file wsPath', {
      invalidPath: wsPath,
    });
  }
  return resolved;
}

function resolveDirWsPath(dirWsPath: string) {
  if (!isDirWsPath(dirWsPath)) {
    return undefined;
  }

  const [wsName, dirPath] = splitWsPath(dirWsPath);
  return {
    wsName,
    dirPath: dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath,
  };
}

// TODO call it resolveFileWsPath
function resolvePath(wsPath: string):
  | {
      wsPath: string;
      wsName: string;
      filePath: string;
      dirPath: string;
      fileName: string;
      fileNameWithoutExt: string;
    }
  | undefined {
  const validationResult = validateWsPath(wsPath);
  if (!validationResult.isValid) {
    return undefined;
  }

  const { wsName, filePath } = validationResult;
  const filePathSplitted = filePath.split('/');
  const fileName = getLast(filePathSplitted);

  if (!fileName) {
    return undefined;
  }

  const dirPath = filePathSplitted.slice(0, -1).join('/');

  return {
    wsPath,
    wsName,
    filePath,
    dirPath,
    fileName,
    fileNameWithoutExt: removeExtension(fileName),
  };
}

function splitWsPath(wsPathOrWsName: string): [string, string] {
  const index = wsPathOrWsName.indexOf(':');

  if (wsPathOrWsName === '') {
    return ['', ''];
  }

  if (index === -1) {
    const ext = getExtension(wsPathOrWsName);
    if (ext) {
      return ['', wsPathOrWsName];
    }

    return [wsPathOrWsName, ''];
  }

  const wsName = wsPathOrWsName.slice(0, index);
  const filePath = wsPathOrWsName.slice(index + 1);

  return [wsName, filePath];
}

function _getWsName(wsPathOrWsName: string) {
  const wsName = splitWsPath(wsPathOrWsName)[0];
  const validationResult = validateWsName(wsName);
  if (!validationResult.isValid) {
    return validationResult;
  }
  return wsName;
}

function getWsName(wsPathOrWsName: string): string | undefined {
  const result = _getWsName(wsPathOrWsName);
  if (typeof result !== 'string') {
    return undefined;
  }
  return result;
}

function assertedGetWsName(wsPathOrWsName: string): string {
  const result = _getWsName(wsPathOrWsName);
  if (typeof result !== 'string') {
    throwAppError('error::ws-path:invalid-ws-name', result.reason, {
      invalidPath: wsPathOrWsName,
    });
  }
  return result;
}

function removeExtension(str: string): string {
  const ext = getExtension(str);
  if (!ext) return str;

  const dotIndex = str.lastIndexOf('.');
  return dotIndex === -1 ? str : str.slice(0, dotIndex);
}

function getLast<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

// only append if there is no extension
function appendNoteExtension(str: string): string {
  const ext = getExtension(str);

  if (ext) {
    return str;
  }

  return removeExtension(str) + DEFAULT_NOTE_EXTENSION;
}

function hasValidNoteExtension(str: string): boolean {
  return VALID_NOTE_EXTENSIONS.some((ext) => str.endsWith(ext));
}

function isValidNoteWsPath(wsPath: string | undefined): boolean {
  if (!wsPath) return false;
  const resolved = resolvePath(wsPath);
  if (!resolved) return false;
  return hasValidNoteExtension(resolved.fileName);
}

function isValidMarkdownWsPath(wsPath: string | undefined): boolean {
  if (!wsPath) return false;
  const ext = getExtension(wsPath);
  if (!ext) return false;

  return VALID_MARKDOWN_EXTENSIONS_SET.has(ext);
}

function assertValidMarkdownWsPath(wsPath: string): void {
  if (!isValidMarkdownWsPath(wsPath)) {
    throwAppError(
      'error::ws-path:invalid-markdown-path',
      'Expected markdown file that ends with .md or .markdown',
      {
        invalidWsPath: wsPath,
      },
    );
  }
}

function assertValidNoteWsPath(wsPath: string): void {
  if (!isValidNoteWsPath(wsPath)) {
    throwAppError(
      'error::ws-path:invalid-note-path',
      'Invalid note file path',
      {
        invalidWsPath: wsPath,
      },
    );
  }
}

function isRootLevelFile(wsPath: string): boolean {
  if (!isValidNoteWsPath(wsPath)) return false;
  const resolved = resolvePath(wsPath);
  if (!resolved) return false;
  return resolved.dirPath === '/' || resolved.dirPath === '';
}

function isFileWsPath(wsPath: string): boolean {
  const validationResult = validateWsPath(wsPath);
  if (!validationResult.isValid) {
    return false;
  }

  return Boolean(getExtension(wsPath));
}

function isDirWsPath(wsPath: string): boolean {
  const validationResult = validateWsPath(wsPath);
  if (!validationResult.isValid) {
    return false;
  }

  return !getExtension(wsPath);
}

function getParentWsPath(wsPath: string): string | undefined {
  const validationResult = validateWsPath(wsPath);
  if (!validationResult.isValid) {
    return undefined;
  }
  const { wsName, filePath } = validationResult;

  if (!filePath || filePath === '') {
    // Already at the top level
    return `${wsName}:`;
  }

  const pathParts = filePath.split('/');
  if (pathParts.length <= 1) {
    // Parent is the root
    return `${wsName}:`;
  }

  const parentPath = pathParts.slice(0, -1).join('/');
  return `${wsName}:${parentPath}`;
}

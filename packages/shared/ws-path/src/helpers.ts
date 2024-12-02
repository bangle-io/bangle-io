import { throwAppError } from '@bangle.io/base-utils';

export const DEFAULT_NOTE_EXTENSION = '.md';
export const VALID_NOTE_EXTENSIONS = [DEFAULT_NOTE_EXTENSION];
export const VALID_NOTE_EXTENSIONS_SET = new Set(VALID_NOTE_EXTENSIONS);

type ValidationResult =
  | { isValid: true; wsName: string; filePath: string }
  | { isValid: false; reason: string; invalidPath: string };

export function pathJoin(...args: string[]): string {
  return args.join('/');
}

export function getExtension(strInput: string): string | undefined {
  let str = strInput;
  if (str.includes('/')) {
    str = str.slice(str.lastIndexOf('/') + 1);
  }
  const dotIndex = str.lastIndexOf('.');
  return dotIndex === -1 ? undefined : str.slice(dotIndex);
}

export function validateWsName(wsName: string): ValidationResult {
  if (typeof wsName !== 'string' || !wsName) {
    return {
      isValid: false,
      reason: 'wsName is not a string or is empty',
      invalidPath: wsName,
    };
  }

  if (wsName.includes(':')) {
    return {
      isValid: false,
      reason: 'wsName contains invalid character ":"',
      invalidPath: wsName,
    };
  }

  return { isValid: true, wsName, filePath: '' };
}

// TODO get rid of fsPath
export function fromFsPath(fsPath: string): string | undefined {
  const [_wsName, ...f] = fsPath.split('/');
  const validationResult = validateWsName(_wsName || '');
  if (!validationResult.isValid) {
    return undefined;
  }
  if (!_wsName || _wsName.includes(':')) {
    return undefined;
  }
  return filePathToWsPath({ wsName: _wsName, inputPath: pathJoin(...f) });
}

export function toFSPath(wsPath: string): string | undefined {
  const resolved = resolvePath(wsPath);
  if (!resolved) return undefined;
  return [resolved.wsName, resolved.filePath].join('/');
}

export function filePathToWsPath({
  wsName,
  inputPath,
}: {
  wsName: string;
  inputPath: string;
}): string {
  const validationResult = validateWsName(wsName);
  if (!validationResult.isValid) {
    throwAppError('error::ws-path:invalid-ws-name', validationResult.reason, {
      invalidPath: wsName,
    });
  }
  let filePath = inputPath;
  if (filePath.startsWith('/')) {
    filePath = filePath.slice(1);
  }
  return `${wsName}:${filePath}`;
}

export function validateWsPath(wsPath: string): ValidationResult {
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

  if (!wsName || !filePath) {
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

export function assertSplitWsPath(wsPath: string): {
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
export function assertedResolvePath(wsPath: string) {
  const resolved = resolvePath(wsPath);
  if (!resolved) {
    throwAppError('error::ws-path:invalid-ws-path', 'Invalid file wsPath', {
      invalidPath: wsPath,
    });
  }
  return resolved;
}

// TODO call it resolveFileWsPath
export function resolvePath(wsPath: string):
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

export function splitWsPath(wsPathOrWsName: string): [string, string] {
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

export function getWsName(wsPathOrWsName: string): string | undefined {
  const result = _getWsName(wsPathOrWsName);
  if (typeof result !== 'string') {
    return undefined;
  }
  return result;
}

export function assertedGetWsName(wsPathOrWsName: string): string {
  const result = _getWsName(wsPathOrWsName);
  if (typeof result !== 'string') {
    throwAppError('error::ws-path:invalid-ws-name', result.reason, {
      invalidPath: wsPathOrWsName,
    });
  }
  return result;
}

export function removeExtension(str: string): string {
  const ext = getExtension(str);
  if (!ext) return str;

  const dotIndex = str.lastIndexOf('.');
  return dotIndex === -1 ? str : str.slice(0, dotIndex);
}

function getLast<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

// only append if there is no extension
export function appendNoteExtension(str: string): string {
  const ext = getExtension(str);

  if (ext) {
    return str;
  }

  return removeExtension(str) + DEFAULT_NOTE_EXTENSION;
}

export function hasValidNoteExtension(str: string): boolean {
  return VALID_NOTE_EXTENSIONS.some((ext) => str.endsWith(ext));
}

export function isValidNoteWsPath(wsPath: string | undefined): boolean {
  if (!wsPath) return false;
  const resolved = resolvePath(wsPath);
  if (!resolved) return false;
  return hasValidNoteExtension(resolved.fileName);
}

export function assertValidNoteWsPath(wsPath: string): void {
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

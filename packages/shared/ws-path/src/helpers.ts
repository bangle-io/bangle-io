import { throwAppError } from '@bangle.io/base-utils';

export const DEFAULT_NOTE_EXTENSION = '.md';
export const VALID_NOTE_EXTENSIONS = [DEFAULT_NOTE_EXTENSION];
export const VALID_NOTE_EXTENSIONS_SET = new Set(VALID_NOTE_EXTENSIONS);

export function pathJoin(...args: string[]) {
  return args.join('/');
}

export function getExtension(strInput: string) {
  let str = strInput;
  if (str.includes('/')) {
    str = str.slice(str.lastIndexOf('/') + 1);
  }
  const dotIndex = str.lastIndexOf('.');
  return dotIndex === -1 ? undefined : str.slice(dotIndex);
}

export function fromFsPath(fsPath: string) {
  const [_wsName, ...f] = fsPath.split('/');
  if (!_wsName || _wsName.includes(':')) {
    return undefined;
  }
  return filePathToWsPath({ wsName: _wsName, inputPath: pathJoin(...f) });
}

export function filePathToWsPath({
  wsName,
  inputPath,
}: { wsName: string; inputPath: string }) {
  let filePath = inputPath;
  if (filePath.startsWith('/')) {
    filePath = filePath.slice(1);
  }
  return `${wsName}:${filePath}`;
}

export const toFSPath = (wsPath: string) => {
  const { wsName, filePath } = resolvePath(wsPath);
  return [wsName, filePath].join('/');
};

export function resolvePath(wsPath: string, skipValidation = true) {
  if (!skipValidation) {
    validateWsPath(wsPath);
    validateFileWsPath(wsPath);
  }
  const [wsName, filePath] = splitWsPath(wsPath);
  const filePathSplitted = filePath.split('/');
  const fileName: string | undefined = getLast(filePathSplitted);

  if (typeof fileName !== 'string') {
    throwAppError('error::ws-path:invalid-ws-path', 'File name is undefined', {
      invalidPath: wsPath,
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

export function validateWsPath(wsPath: string) {
  if (wsPath.split('/').some((r) => r.length === 0)) {
    throwAppError('error::ws-path:invalid-ws-path', 'Invalid path', {
      invalidPath: wsPath,
    });
  }
  const [_wsName, _filePath, ...others] = wsPath.split(':');
  if (others.length > 0) {
    throwAppError(
      'error::ws-path:invalid-ws-path',
      'Semicolon not allowed in file path',
      {
        invalidPath: wsPath,
      },
    );
  }
  if (!isWsPath(wsPath)) {
    throwAppError('error::ws-path:invalid-ws-path', 'Invalid wsPath', {
      invalidPath: wsPath,
    });
  }
}

export function validateFileWsPath(wsPath: string) {
  if (!isValidFileWsPath(wsPath)) {
    throwAppError('error::ws-path:invalid-ws-path', 'Invalid file wsPath', {
      invalidPath: wsPath,
    });
  }
  validateWsPath(wsPath);
}

export function splitWsPath(wsPath: string): [string, string] {
  const [wsName, filePath] = wsPath.split(':');
  if (!wsName) {
    throwAppError('error::ws-path:invalid-ws-path', 'Invalid wsName', {
      invalidPath: wsPath,
    });
  }
  if (!filePath) {
    throwAppError('error::ws-path:invalid-ws-path', 'Invalid filePath', {
      invalidPath: wsPath,
    });
  }
  return [wsName, filePath];
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

export function isValidNoteWsPath(wsPath: string | undefined) {
  return wsPath ? hasValidNoteExtension(wsPath) : false;
}

function hasValidNoteExtension(str: string) {
  return VALID_NOTE_EXTENSIONS.some((ext) => str.endsWith(ext));
}

export function removeExtension(str: string) {
  const dotIndex = str.lastIndexOf('.');
  return dotIndex === -1 ? str : str.slice(0, dotIndex);
}

function getLast<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

export function appendNoteExtension(str: string) {
  return removeExtension(str) + DEFAULT_NOTE_EXTENSION;
}

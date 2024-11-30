import { throwAppError } from '@bangle.io/base-utils';

export function validateInputPath(inputPath: unknown): void {
  if (typeof inputPath !== 'string') {
    throwAppError('error::ws-path:create-new-note', 'Invalid note path', {
      invalidWsPath: `${inputPath}`,
    });
  }
  if (
    inputPath.endsWith('/') ||
    inputPath.endsWith('/.md') ||
    inputPath.trim() === ''
  ) {
    throwAppError('error::ws-path:create-new-note', 'Invalid note path', {
      invalidWsPath: inputPath,
    });
  }
  if (inputPath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(inputPath)) {
    throwAppError(
      'error::ws-path:create-new-note',
      'Absolute paths are not allowed',
      {
        invalidWsPath: inputPath,
      },
    );
  }
  if (inputPath.includes('../') || inputPath.includes('..\\')) {
    throwAppError(
      'error::ws-path:create-new-note',
      'Directory traversal is not allowed',
      {
        invalidWsPath: inputPath,
      },
    );
  }
  // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
  const invalidChars = /[<>:"\\|?*\x00-\x1F]/g;
  if (invalidChars.test(inputPath)) {
    throwAppError(
      'error::ws-path:create-new-note',
      'Invalid characters in path',
      {
        invalidWsPath: inputPath,
      },
    );
  }
  const maxPathLength = 255;
  if (inputPath.length > maxPathLength) {
    throwAppError(
      'error::ws-path:create-new-note',
      'Path exceeds maximum length',
      {
        invalidWsPath: inputPath,
      },
    );
  }
}

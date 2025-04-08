import { throwAppError } from '@bangle.io/base-utils';

export function validateInputPath(inputPath: unknown): void {
  if (typeof inputPath !== 'string') {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.invalidNotePath,
      {
        invalidWsPath: `${inputPath}`,
      },
    );
  }
  if (
    inputPath.endsWith('/') ||
    inputPath.endsWith('/.md') ||
    inputPath.trim() === ''
  ) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.invalidNotePath,
      {
        invalidWsPath: inputPath,
      },
    );
  }
  if (inputPath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(inputPath)) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.absolutePathNotAllowed,
      {
        invalidWsPath: inputPath,
      },
    );
  }
  if (inputPath.includes('../') || inputPath.includes('..\\')) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.directoryTraversalNotAllowed,
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
      t.app.errors.wsPath.invalidCharsInPath,
      {
        invalidWsPath: inputPath,
      },
    );
  }
  const maxPathLength = 255;
  if (inputPath.length > maxPathLength) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.pathTooLong,
      {
        invalidWsPath: inputPath,
      },
    );
  }
}

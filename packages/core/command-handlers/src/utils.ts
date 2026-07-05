import { throwAppError } from '@bangle.io/base-utils';
import { WsPath } from '@bangle.io/ws-path';

const MAX_PATH_LENGTH = 255;

function throwInvalidPath(message: string, invalidWsPath: string): never {
  throwAppError('error::ws-path:create-new-note', message, {
    invalidWsPath,
  });
}

/**
 * Maps a generic `WsPath.validation.validatePath` failure reason to the
 * user-facing message category used by note-creation flows. The reason
 * strings originate from `@bangle.io/ws-path` (`validation.ts`); if that
 * wording changes and stops matching here, callers still get a safe,
 * generic `invalidNotePath` message rather than a crash.
 */
function messageForPathValidationReason(reason: string): string {
  switch (reason) {
    case 'Invalid wsPath: File path cannot start with a forward slash (/)':
      return t.app.errors.wsPath.absolutePathNotAllowed;
    case 'Invalid wsPath: Path segments cannot be "." or ".."':
      return t.app.errors.wsPath.directoryTraversalNotAllowed;
    case 'Invalid wsPath: Path segment contains invalid characters':
      return t.app.errors.wsPath.invalidCharsInPath;
    default:
      return t.app.errors.wsPath.invalidNotePath;
  }
}

export function validateInputPath(inputPath: unknown): void {
  if (typeof inputPath !== 'string') {
    throwInvalidPath(t.app.errors.wsPath.invalidNotePath, `${inputPath}`);
  }

  // Note-path specific rules: these have no equivalent in the generic
  // `ws-path` path validation and are not duplicated logic.
  if (
    inputPath.endsWith('/') ||
    inputPath.endsWith('/.md') ||
    inputPath.trim() === ''
  ) {
    throwInvalidPath(t.app.errors.wsPath.invalidNotePath, inputPath);
  }

  const result = WsPath.validation.validatePath(inputPath);
  if (!result.ok) {
    throwInvalidPath(
      messageForPathValidationReason(result.validationError.reason),
      inputPath,
    );
  }

  if (inputPath.length > MAX_PATH_LENGTH) {
    throwInvalidPath(t.app.errors.wsPath.pathTooLong, inputPath);
  }
}

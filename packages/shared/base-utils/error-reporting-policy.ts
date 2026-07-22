import type { ErrorReporter } from '@bangle.io/logger';
import type { AppError } from '@bangle.io/types';
import { getAppErrorCause, isAppError } from './throw-app-error';

export function shouldReportAppError(appError: AppError): boolean {
  switch (appError.name) {
    case 'error::file:already-existing':
    case 'error::file:size-too-large':
    case 'error::file-storage:file-does-not-exist':
    case 'error::workspace:native-fs-auth-needed':
    case 'error::workspace:native-fs-locate-failed':
    case 'error::workspace:native-fs-reconnect-failed':
    case 'error::workspace:no-note-opened':
    case 'error::workspace:no-notes-found':
    case 'error::workspace:not-opened':
    case 'error::ws-path:create-new-note':
    case 'error::ws-path:invalid-markdown-path':
    case 'error::ws-path:invalid-note-path':
    case 'error::ws-path:invalid-ws-name':
    case 'error::ws-path:invalid-ws-path':
      return false;
    default:
      return true;
  }
}

/** Captures at the error boundary, before UI error subscribers are mounted. */
export function captureReportableError(
  reporter: ErrorReporter,
  error: Error,
): boolean {
  if (isAppError(error)) {
    const appError = getAppErrorCause(error);
    if (appError && !shouldReportAppError(appError)) {
      return false;
    }
  }

  reporter.captureException(error);
  return true;
}

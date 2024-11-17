const ABORTED_ERROR_TEXT_CHROME = 'The user aborted a request.';
const ABORTED_ERROR_TEXT_MOZILLA = 'The operation was aborted. ';
const ABORTED_ERROR_TEXT_SAFARI = 'Fetch is aborted';

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  // Various environments have different names for this error
  if (
    error instanceof Error &&
    error.name === 'AbortError' &&
    [
      ABORTED_ERROR_TEXT_CHROME,
      ABORTED_ERROR_TEXT_MOZILLA,
      ABORTED_ERROR_TEXT_SAFARI,
    ].includes(error.message)
  ) {
    return true;
  }

  return false;
}

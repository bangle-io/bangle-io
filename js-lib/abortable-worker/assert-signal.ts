// Throws an abort error if a signal is already aborted.
export function assertSignal(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException('AbortError', 'AbortError');
  }
}

export function isWorkerGlobalScope() {
  return (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-restricted-globals, no-undef
    self instanceof WorkerGlobalScope
  );
}

/**
 * throws an error in not in a web worker environment
 */
export function validateWorkerGlobalScope() {
  if (isWorkerGlobalScope()) {
    return;
  }
  throw new Error('Script can only run in worker environment');
}

export function validateNonWorkerGlobalScope() {
  if (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-restricted-globals, no-undef
    self instanceof WorkerGlobalScope
  ) {
    throw new Error('Script cannot run in worker environment');
  }
  return;
}

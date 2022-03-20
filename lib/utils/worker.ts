// TODO remove this
declare global {
  var WorkerGlobalScope: any;
}

export function isWorkerGlobalScope() {
  return (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-restricted-globals, no-undef
    self instanceof WorkerGlobalScope
  );
}

export function getSelfType(): 'worker' | 'window' {
  return typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-restricted-globals, no-undef
    self instanceof WorkerGlobalScope
    ? 'worker'
    : 'window';
}
/**
 * throws an error in not in a web worker environment
 */
export function assertWorkerGlobalScope() {
  if (isWorkerGlobalScope()) {
    return;
  }
  throw new Error('Script can only run in worker environment');
}

export function assertNonWorkerGlobalScope() {
  if (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-restricted-globals, no-undef
    self instanceof WorkerGlobalScope
  ) {
    throw new Error('Script cannot run in worker environment');
  }

  return;
}

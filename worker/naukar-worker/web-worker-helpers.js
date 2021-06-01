export function checkModuleWorkerSupport() {
  let supportsModuleWorker = false;
  const options = {
    get type() {
      supportsModuleWorker = true;
      return 'module';
    },
  };
  try {
    new Worker('data:', options);
  } catch (err) {
    supportsModuleWorker = false;
    // Hope the worker didn't throw for some other reason, or filter out the error
  }

  return supportsModuleWorker;
}

/**
 * throws an error in not in a web worker environment
 */
export function validateWorkerGlobalScope() {
  if (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-restricted-globals, no-undef
    self instanceof WorkerGlobalScope
  ) {
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
    debugger;
    throw new Error('Script cannot run in worker environment');
  }
  return;
}

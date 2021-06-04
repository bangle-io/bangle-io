import { validateNonWorkerGlobalScope } from 'naukar-worker/index';

validateNonWorkerGlobalScope();

export const moduleSupport = checkModuleWorkerSupport();

function checkModuleWorkerSupport() {
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

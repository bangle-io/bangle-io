import { BANGLE_HOT } from 'config';
import { validateNonWorkerGlobalScope } from 'naukar-worker';
validateNonWorkerGlobalScope();

export const moduleSupport = checkModuleWorkerSupport();

function checkModuleWorkerSupport() {
  // hot module reload aint working with workers
  if (BANGLE_HOT) {
    return false;
  }

  let supportsModuleWorker = false;
  const options: any = {
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

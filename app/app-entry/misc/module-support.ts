import { BANGLE_HOT } from '@bangle.io/config';
import { validateNonWorkerGlobalScope } from '@bangle.io/naukar-worker';

validateNonWorkerGlobalScope();

export const moduleSupport = checkModuleWorkerSupport();

function checkModuleWorkerSupport() {
  // hot module reload aint working with workers
  if (BANGLE_HOT) {
    console.debug('BANGLE_HOT is on, disabling worker');
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

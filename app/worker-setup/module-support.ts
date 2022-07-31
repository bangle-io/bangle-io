import { BANGLE_HOT } from '@bangle.io/config';
import { assertNonWorkerGlobalScope, isSafari } from '@bangle.io/utils';

assertNonWorkerGlobalScope();

export function checkModuleWorkerSupport() {
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
    if (isSafari) {
      // this is a browser specific hack to detect
      // module support
      new Worker('data:,', options).terminate();
    } else {
      new Worker('data:', options).terminate();
    }
  } catch (err) {
    supportsModuleWorker = false;
    // Hope the worker didn't throw for some other reason, or filter out the error
  }

  return supportsModuleWorker;
}

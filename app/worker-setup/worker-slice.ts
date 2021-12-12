import { Slice } from '@bangle.io/create-store';
import { setNaukarReady } from '@bangle.io/naukar-proxy';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

import { checkModuleWorkerSupport } from './module-support';
import { workerSetup } from './worker-setup';

assertNonWorkerGlobalScope();

const loadWebworker = checkModuleWorkerSupport();

export function workerSlice() {
  return new Slice({
    sideEffect() {
      let terminate: (() => void) | undefined;
      let destroyed = false;

      workerSetup(loadWebworker).then(async (result) => {
        if (destroyed) {
          return;
        }
        terminate = result.terminate;
        // Tell the proxy that the worker is ready
        // this will resolve the promise blocking anyone from
        // accessing naukar methods
        // setNaukarReady(naukar);
        setNaukarReady(result.naukar);
      });

      return {
        destroy() {
          destroyed = true;
          terminate?.();
        },
      };
    },
  });
}

import { naukarWorkerProxy } from 'naukar-proxy';
import { objectSync } from 'object-sync/index';
import * as Comlink from 'comlink';
import { validateNonWorkerGlobalScope } from 'naukar-worker';
import { initialAppState } from 'shared/index';
import { moduleSupport } from 'worker-setup/index';

validateNonWorkerGlobalScope();

export const appState = objectSync(initialAppState, (event) => {
  naukarWorkerProxy.updateAppState(event);
});

if (moduleSupport) {
  naukarWorkerProxy.registerUpdateCallback(
    Comlink.proxy((event) => appState.applyChange(event)),
  );
} else {
  naukarWorkerProxy.registerUpdateCallback((event) =>
    appState.applyChange(event),
  );
}

import * as Comlink from 'comlink';

import { BaseAction, Slice } from '@bangle.io/create-store';
import { naukarWorkerProxy, setNaukarReady } from '@bangle.io/naukar-proxy';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

import { checkModuleWorkerSupport } from './module-support';
import { workerSetup } from './worker-setup';

assertNonWorkerGlobalScope();

const loadWebworker = checkModuleWorkerSupport();

type WorkspaceSliceState = {
  pendingActions: BaseAction[];
};

let whiteListedActions = ['action::@bangle.io/slice-page:'];

export function workerSlice() {
  return new Slice<WorkspaceSliceState, BaseAction>({
    state: {
      init() {
        return { pendingActions: [] };
      },
      apply(action, sliceState) {
        if (whiteListedActions.some((rule) => action.name.startsWith(rule))) {
          sliceState.pendingActions.push(action);
        }
        return sliceState;
      },
    },
    sideEffect(store) {
      let terminate: (() => void) | undefined;
      let destroyed = false;

      let workerReady = false;
      let { port1, port2 } = new MessageChannel();

      port1.onmessage = ({ data }) => {
        if (data?.type === 'action') {
          let parsed = store.parseAction(data.action);
          if (parsed) {
            console.debug('action from worker', parsed);
            store.dispatch(parsed);
          }
        }
      };

      workerSetup(loadWebworker).then(async (result) => {
        if (destroyed) {
          return;
        }

        naukarWorkerProxy.sendMessagePort(Comlink.transfer(port2, [port2]));

        terminate = result.terminate;
        // Tell the proxy that the worker is ready
        // this will resolve the promise blocking anyone from
        // accessing naukar methods
        // setNaukarReady(naukar);
        setNaukarReady(result.naukar);
        workerReady = true;
      });

      return {
        update(store, _, sliceState) {
          if (!workerReady) {
            return;
          }
          let action: BaseAction | undefined;

          while ((action = sliceState.pendingActions.shift())) {
            if (!action.fromStore) {
              const serializedAction = store.serializeAction(action);
              port1.postMessage({
                type: 'action',
                action: serializedAction,
              });
            }
          }
        },
        destroy() {
          destroyed = true;
          workerReady = false;
          terminate?.();
        },
      };
    },
  });
}

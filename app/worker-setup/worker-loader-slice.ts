import { Slice, SliceKey, SliceSideEffect } from '@bangle.io/create-store';
import type { BangleStateOpts } from '@bangle.io/shared-types';
import { assertActionName, assertNonWorkerGlobalScope } from '@bangle.io/utils';
import { setNaukarReady } from '@bangle.io/worker-naukar-proxy';

import { workerSetup } from './worker-setup';

assertNonWorkerGlobalScope();

type ActionType = {
  name: 'action::@bangle.io/worker-setup:worker-loader:worker-is-ready';
};

type StateType = {
  workerLoaded: boolean;
};

export const workerLoaderSliceKey = new SliceKey<StateType, ActionType>(
  'workerLoaderSlice',
);

type WorkerSetupSideEffect = SliceSideEffect<
  StateType,
  ActionType,
  BangleStateOpts
>;

/**
 * Loads and initializes the worker thread.
 */
export function workerLoaderSlice() {
  assertActionName('@bangle.io/worker-setup', workerLoaderSliceKey);

  return new Slice({
    key: workerLoaderSliceKey,
    state: {
      init() {
        return {
          workerLoaded: false,
        };
      },
      apply(action, state) {
        if (
          action.name ===
          'action::@bangle.io/worker-setup:worker-loader:worker-is-ready'
        ) {
          return { ...state, workerLoaded: true };
        }
        return state;
      },
    },
    sideEffect: [loadWorkerModuleEffect],
  });
}

const loadWorkerModuleEffect: WorkerSetupSideEffect = (_, config) => {
  return {
    deferredOnce(store, abortSignal) {
      let terminate: (() => void) | undefined;
      let destroyed = false;

      workerSetup(config.loadWorker).then(async (result) => {
        if (destroyed) {
          return;
        }
        terminate = result.terminate;

        // Tell the proxy that the worker is ready
        // this will resolve the promise blocking anyone from
        // accessing naukar methods
        setNaukarReady(result.naukar);
        store.dispatch({
          name: 'action::@bangle.io/worker-setup:worker-loader:worker-is-ready',
        });
      });

      abortSignal.addEventListener('abort', () => {
        destroyed = true;
        terminate?.();
      });
    },
  };
};

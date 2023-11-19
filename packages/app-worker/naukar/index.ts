import { applyPatches, enablePatches, produce } from 'immer';

import { Emitter } from '@bangle.io/emitter';
import { getWindowActionsRef } from '@bangle.io/naukar-common';
import {
  createNaukarStore,
  windowStoreReplicaSlice,
} from '@bangle.io/naukar-store';
import { superJson } from '@bangle.io/nsm-3';
import type {
  EternalVarsWorker,
  NaukarBare,
  WindowActions,
} from '@bangle.io/shared-types';

enablePatches();

import { logger } from './logger';

export interface NaukarConfig {
  eternalVars: EternalVarsWorker;
}

function setupWindowAction() {
  const emitter = Emitter.create<{ event: 'ready'; payload: undefined }>();
  let ready = false;
  let _actual: WindowActions | undefined;

  const onReady = new Promise<void>((resolve) => {
    emitter.on('ready', () => {
      ready = true;
      resolve();
    });
  });

  return {
    proxy: new Proxy({} as any, {
      get(target, prop, receiver) {
        if (_actual) {
          return Reflect.get(_actual, prop, receiver);
        }

        // we have checks to ensure windowActions is a Record<string, AnyFunction>
        return (...args: any[]) => {
          return onReady.then(() => {
            const func = Reflect.get(_actual!, prop, receiver);
            return Reflect.apply(func, _actual!, args);
          });
        };
      },
    }),
    setActual: (windowActions: WindowActions) => {
      if (ready) {
        throw new Error(
          `setWindowAction called more than once. This should not happen`,
        );
      }
      _actual = windowActions;
      emitter.emit('ready', undefined);
    },
  };
}

let privateState = new WeakMap<
  Naukar,
  {
    windowActionProxy: ReturnType<typeof setupWindowAction>;
    store: ReturnType<typeof createNaukarStore>;
  }
>();

export class Naukar implements NaukarBare {
  private lastPatchId = -1;

  constructor(private naukarConfig: NaukarConfig) {
    logger.debug('naukarConfig', naukarConfig);
    const store = createNaukarStore({ eternalVars: naukarConfig.eternalVars });
    const windowActionProxy = setupWindowAction();

    privateState.set(this, {
      windowActionProxy,
      store,
    });

    const windowActionRef = getWindowActionsRef(store);
    windowActionRef.current = windowActionProxy.proxy;
  }

  // NOTE: all public interfaces are accessible by the main thread
  // ALL METHODS SHOULD BE Binded to this class using => syntax
  // this is some weirdness where `this` is lost when calling from main thread
  ok = () => {
    return true;
  };

  getDebugFlags = () => {
    return this.naukarConfig.eternalVars.debugFlags;
  };

  receiveWindowActions = (windowActions: WindowActions) => {
    const { windowActionProxy } = privateState.get(this)!;
    windowActionProxy.setActual(windowActions);
  };

  receivePatches = ({ id, patches }: { id: number; patches: string }) => {
    logger.warn('receivePatches', { id, patches });

    if (id != this.lastPatchId + 1) {
      throw new Error(
        `Incorrect order of patches. Received id ${id} but lastPatchId is ${this.lastPatchId}`,
      );
    }
    this.lastPatchId++;

    const txn = windowStoreReplicaSlice.actions.updateWindowReplica(
      (currentState) => {
        const patchesObj: any = superJson.parse(patches);
        const nextState = produce(currentState, (draft) => {
          applyPatches(draft, patchesObj);
        });
        return nextState;
      },
    );

    const { store } = privateState.get(this)!;
    store.dispatch(txn);
  };
}

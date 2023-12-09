import { applyPatches, enablePatches, produce } from 'immer';

import { appErrorHandler } from '@bangle.io/app-error-handler';
import { BaseError } from '@bangle.io/base-error';
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
  let _actual: WindowActions | undefined;

  const onReady = new Promise<void>((resolve) => {
    emitter.on('ready', () => {
      resolve();
      emitter.destroy();
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
      if (_actual) {
        throw new Error(
          `setWindowAction called more than once. This should not happen`,
        );
      }
      _actual = windowActions;
      emitter.emit('ready', undefined);
    },
  };
}

export class Naukar implements NaukarBare {
  private lastPatchId = -1;
  private windowActionProxy = setupWindowAction();
  private store: ReturnType<typeof createNaukarStore>;

  constructor(private naukarConfig: NaukarConfig) {
    logger.debug('naukarConfig', naukarConfig);
    this.store = createNaukarStore({ eternalVars: naukarConfig.eternalVars });

    getWindowActionsRef(this.store).current = this.windowActionProxy.proxy;

    const handleRejection = (event: PromiseRejectionEvent | ErrorEvent) => {
      const handle = (error: unknown) => {
        return appErrorHandler(
          error,
          (dialog) => {
            void getWindowActionsRef(this.store)
              .current?.queueDialog({
                dialogRequest: dialog,
              })
              .catch((error) => {
                // we swallow this error as we don't want to throw from here
                // as it can cause infinite loop
                logger.error('queueToast error', error);
              });
          },
          (toast) => {
            void getWindowActionsRef(this.store)
              .current?.queueToast({
                toastRequest: toast,
              })
              .catch((error) => {
                // we swallow this error as we don't want to throw from here
                // as it can cause infinite loop
                logger.error('queueToast error', error);
              });
          },
        );
      };

      if ('reason' in event) {
        let error = event.reason;
        if (handle(error)) {
          logger.debug('Handled rejection', error);
          event.preventDefault();
        }
      } else {
        let error = event.error;
        if (handle(error)) {
          logger.debug('Handled error', error);
          event.preventDefault();
        }
      }
    };

    globalThis.addEventListener?.('unhandledrejection', handleRejection);
    globalThis.addEventListener?.('error', handleRejection);
  }

  destroy() {
    this.store.destroy();
  }

  // NOTE: all public interfaces are accessible by the main thread
  ok() {
    return true;
  }

  readWindowState() {
    return windowStoreReplicaSlice.get(this.store.state).windowStateReplica;
  }

  readDebugFlags() {
    return this.naukarConfig.eternalVars.debugFlags;
  }

  sendWindowActions(windowActions: WindowActions) {
    this.windowActionProxy.setActual(windowActions);
  }

  sendPatches({ id, patches }: { id: number; patches: string }) {
    logger.warn('sendPatches', { id, patches });

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

    this.store.dispatch(txn);
  }
}

import { applyPatches, enablePatches, produce } from 'immer';

import {
  createNaukarStore,
  windowStoreReplicaSlice,
} from '@bangle.io/naukar-store';
import { superJson } from '@bangle.io/nsm-3';
import type { EternalVarsWorker, NaukarBare } from '@bangle.io/shared-types';
enablePatches();

import { logger } from './logger';

export interface NaukarConfig {
  eternalVars: EternalVarsWorker;
}

export class Naukar implements NaukarBare {
  private store: ReturnType<typeof createNaukarStore>;
  private lastPatchId = -1;

  constructor(private naukarConfig: NaukarConfig) {
    logger.debug('naukarConfig', naukarConfig);
    this.store = createNaukarStore({ eternalVars: naukarConfig.eternalVars });
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

    this.store.dispatch(txn);
  };
}

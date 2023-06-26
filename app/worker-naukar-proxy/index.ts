import { mainInjectAbortableProxy } from '@bangle.io/abortable-worker';
import type { NaukarWorkerAPI } from '@bangle.io/shared-types';
import { Emitter } from '@bangle.io/utils';

import { READY, waitProxy } from './proxy-wait';

let naukarRef: { current: undefined | NaukarWorkerAPI } = {
  current: undefined,
};

const emitter = new Emitter();

export function _setWorker(incomingNaukar: NaukarWorkerAPI) {
  naukarRef.current = incomingNaukar;
  emitter.emit(READY, undefined);
}

export function _clearWorker() {
  naukarRef.current = undefined;
}

// a proxy to the worker entry, will stall any methods
// until the worker is marked ready.
export const naukarProxy: NaukarWorkerAPI = {
  editor: waitProxy<NaukarWorkerAPI['editor']>(() => {
    if (naukarRef.current) {
      return naukarRef.current.editor;
    }

    return undefined;
  }, emitter),

  test: waitProxy<NaukarWorkerAPI['test']>(() => {
    if (naukarRef.current) {
      return naukarRef.current.test;
    }

    return undefined;
  }, emitter),

  workspace: waitProxy<NaukarWorkerAPI['workspace']>(() => {
    if (naukarRef.current) {
      return naukarRef.current.workspace;
    }

    return undefined;
  }, emitter),

  abortable: mainInjectAbortableProxy(
    waitProxy<NaukarWorkerAPI['abortable']>(() => {
      if (naukarRef.current) {
        return naukarRef.current.abortable;
      }

      return undefined;
    }, emitter),
  ),

  replicaSlices: waitProxy<NaukarWorkerAPI['replicaSlices']>(() => {
    if (naukarRef.current) {
      return naukarRef.current.replicaSlices;
    }

    return undefined;
  }, emitter),
};

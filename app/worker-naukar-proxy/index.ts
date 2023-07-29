import { mainInjectAbortableProxy } from '@bangle.io/abortable-worker';
import type { NaukarWorkerAPI } from '@bangle.io/shared-types';

import { waitForProxy } from './wait-for-proxy';

const naukarRef: { current: undefined | NaukarWorkerAPI } = {
  current: undefined,
};

const check: Array<() => void> = [];

let isNaukarReady = {
  current: false,
};

const editorProxy = waitForProxy<NaukarWorkerAPI['editor']>(
  isNaukarReady,
  () => {
    return naukarRef.current?.editor!;
  },
);

check.push(editorProxy.check);

const testProxy = waitForProxy<NaukarWorkerAPI['test']>(isNaukarReady, () => {
  return naukarRef.current?.test!;
});

check.push(testProxy.check);

const workspaceProxy = waitForProxy<NaukarWorkerAPI['workspace']>(
  isNaukarReady,
  () => {
    return naukarRef.current?.workspace!;
  },
);

check.push(workspaceProxy.check);

const abortableProxy = waitForProxy<NaukarWorkerAPI['abortable']>(
  isNaukarReady,
  () => {
    return naukarRef.current?.abortable!;
  },
);

check.push(abortableProxy.check);

const replicaSlicesProxy = waitForProxy<NaukarWorkerAPI['replicaSlices']>(
  isNaukarReady,
  () => {
    return naukarRef.current?.replicaSlices!;
  },
);

check.push(replicaSlicesProxy.check);

if (check.length !== 5) {
  throw new Error('Incorrect number of checks');
}

export function _setWorker(incomingNaukar: NaukarWorkerAPI) {
  naukarRef.current = incomingNaukar;
  isNaukarReady.current = true;

  check.forEach((check) => check());
}

export function _clearWorker() {
  naukarRef.current = undefined;
  isNaukarReady.current = false;
}

// a proxy will stall any methods
// until the worker is marked ready.
export const naukarProxy: NaukarWorkerAPI = {
  editor: editorProxy.proxy,

  test: testProxy.proxy,

  workspace: workspaceProxy.proxy,

  abortable: mainInjectAbortableProxy(abortableProxy.proxy),

  replicaSlices: replicaSlicesProxy.proxy,
};

import { mainInjectAbortableProxy } from '@bangle.io/abortable-worker';
import { Emitter } from '@bangle.io/utils';
import type { WorkerAPI } from '@bangle.io/worker-naukar';

let naukarRef: { current: undefined | WorkerAPI } = {
  current: undefined,
};

const emitter = new Emitter();

export function _setWorker(incomingNaukar: WorkerAPI) {
  naukarRef.current = incomingNaukar;
  emitter.emit('ready', undefined);
}

export function _clearWorker() {
  naukarRef.current = undefined;
}

const injectWaitOnWorkerReadyProxy: WorkerAPI = new Proxy<WorkerAPI>(
  {} as any,
  {
    get(_target, prop) {
      if (naukarRef.current) {
        return Reflect.get(naukarRef.current, prop);
      }

      // untill naukar is not ready
      // wrap the it in a promise which resolves
      // when it is ready.
      return <T>(...args: T[]) => {
        return new Promise((res, rej) => {
          const callback = () => {
            emitter.off('ready', callback);
            try {
              // currently only supports callable
              let value = Reflect.apply(
                Reflect.get(naukarRef.current!, prop),
                null,
                args,
              );
              res(value);
            } catch (error) {
              rej(error);
            }
          };
          emitter.on('ready', callback);
        });
      };
    },
  },
);

const injectAbortable = mainInjectAbortableProxy(injectWaitOnWorkerReadyProxy);

// a proxy to the worker entry, will stall any methods
// until the worker is marked ready.
export const naukarProxy = injectAbortable;

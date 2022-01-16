import { mainInjectAbortableProxy } from '@bangle.io/abortable-worker';
import { Emitter } from '@bangle.io/utils';
import type { WorkerAPI } from '@bangle.io/worker-naukar';

let naukar;

const emitter = new Emitter();

export const setNaukarReady = (_naukar) => {
  naukar = _naukar;

  emitter.emit('ready', undefined);
};

const injectWaitOnWorkerReadyProxy: WorkerAPI = new Proxy<WorkerAPI>(
  {} as any,
  {
    get(_target, prop) {
      if (naukar) {
        return Reflect.get(naukar, prop);
      }

      // untill naukar is not ready
      // wrap the it in a promise which resolves
      // when it is ready.
      return (...args) => {
        return new Promise((res, rej) => {
          const callback = () => {
            emitter.off('ready', callback);
            try {
              // curently only supports callable
              let value = Reflect.apply(Reflect.get(naukar, prop), null, args);
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

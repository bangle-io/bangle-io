import type { WorkerAPI } from '@bangle.io/naukar-worker';
import { Emitter } from '@bangle.io/utils';

let naukar;

const emitter = new Emitter();

export const setNaukarReady = (_naukar) => {
  naukar = _naukar;
  emitter.emit('ready', undefined);
};

export const naukarWorkerProxy = new Proxy<WorkerAPI>({} as any, {
  get(_target, prop) {
    if (naukar) {
      return Reflect.get(naukar, prop);
    }
    return (...args) => {
      return new Promise((res, rej) => {
        const callback = () => {
          try {
            // curently only supports callable
            let value = Reflect.apply(Reflect.get(naukar, prop), null, args);
            res(value);
            emitter.off('ready', callback);
          } catch (error) {
            rej(error);
            emitter.off('ready', callback);
          }
        };
        emitter.on('ready', callback);
      });
    };
  },
});

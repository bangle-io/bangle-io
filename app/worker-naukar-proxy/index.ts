import { mainInjectAbortableProxy } from '@bangle.io/abortable-worker';
import { Slice, SliceKey } from '@bangle.io/create-store';
import { Emitter } from '@bangle.io/utils';
import type { WorkerAPI } from '@bangle.io/worker-naukar';

let naukarRef: { current: undefined | WorkerAPI } = {
  current: undefined,
};

const emitter = new Emitter();

export const naukarProxySliceKey = new SliceKey<
  {
    naukar: WorkerAPI | undefined;
  },
  {
    name: 'action::@bangle.io/worker-naukar-proxy:naukar';
    value: {
      naukar: WorkerAPI | undefined;
    };
  }
>('naukarProxySliceKey');

export function setNaukarProxyState(naukar: WorkerAPI | undefined) {
  return naukarProxySliceKey.op((state, dispatch): void => {
    dispatch({
      name: 'action::@bangle.io/worker-naukar-proxy:naukar',
      value: {
        naukar: naukar,
      },
    });
  });
}

export function naukarProxySlice() {
  return new Slice({
    key: naukarProxySliceKey,
    state: {
      init() {
        return { naukar: undefined };
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::@bangle.io/worker-naukar-proxy:naukar': {
            return {
              ...state,
              naukar: action.value.naukar,
            };
          }
          default: {
            return state;
          }
        }
      },
    },
    sideEffect() {
      return {
        update(store, prevState) {
          const incomingNaukar = naukarProxySliceKey.getValueIfChanged(
            'naukar',
            store.state,
            prevState,
          );

          if (incomingNaukar != null) {
            naukarRef.current = incomingNaukar;
            emitter.emit('ready', undefined);
          }
        },
      };
    },
  });
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
              // curently only supports callable
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

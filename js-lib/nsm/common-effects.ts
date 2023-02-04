// import { CORE_ACTION_ON_READY } from './constants';
import { key, slice } from './create';
import type { Slice } from './slice';
import type { ReducedStore } from './store';

const CORE_ACTION_ON_READY = 'daddy';
const keys: { [k: string]: number } = Object.create(null);

export function createKey(name: string) {
  if (name in keys) {
    return name + '#' + ++keys[name];
  }
  keys[name] = 0;

  return name + '#';
}

const runOnceEffect = <K extends string, DS extends Slice[]>(
  name: K,
  deps: DS,
  cb: (state: any) => void,
) =>
  slice({
    key: key(name, deps, {
      ready: false,
    }),
    actions: {
      [CORE_ACTION_ON_READY]: () => () => {
        return {
          ready: true,
        };
      },
    },
    effects: {
      update(sl, store, prevStoreState) {
        // let f: ReducedStore<typeof sl>['state'] = store.state;
        // let f: InferSlicesKey<DS> = {} as any;

        if (
          sl.getState(store.state).ready &&
          !sl.getState(prevStoreState).ready
        ) {
          //   cb(store.state, store.dispatch);
        }
      },
    },
  });

const sl = runOnceEffect('hi', [], () => {});

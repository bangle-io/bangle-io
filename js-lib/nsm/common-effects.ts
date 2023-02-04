import { CORE_ACTION_ON_READY } from './constants';
import { key, slice } from './create';
import type { Slice } from './slice';
import type { ReducedStore } from './store';

const keys: { [k: string]: number } = Object.create(null);

export function createKey(name: string) {
  if (name in keys) {
    return name + '#' + ++keys[name];
  }
  keys[name] = 0;

  return name + '#';
}

type OpaqueSlice<K extends string, DS extends Slice[]> = Slice<
  K,
  {},
  DS,
  {},
  {}
>;

type ReducedStoreFromDS<DS extends Slice[]> = ReducedStore<DS[number]>;

export const onceEffect = <K extends string, DS extends Slice[]>(
  name: K,
  deps: DS,
  cb: (
    state: ReducedStoreFromDS<DS>['state'],
    dispatch: ReducedStoreFromDS<DS>['dispatch'],
  ) => void,
): OpaqueSlice<K, DS> => {
  return slice({
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
        //  ts is unable to deal with DS as part of the type
        let _store: ReducedStore<typeof sl> = store;
        let _prevState: ReducedStore<typeof sl>['state'] = prevStoreState;

        if (sl.getState(_store.state).ready && !sl.getState(_prevState).ready) {
          cb(store.state, store.dispatch);
        }
      },
    },
  });
};

export const syncOnceEffect = <K extends string, DS extends Slice[]>(
  name: K,
  deps: DS,
  cb: (
    state: ReducedStoreFromDS<DS>['state'],
    dispatch: ReducedStoreFromDS<DS>['dispatch'],
  ) => void,
): OpaqueSlice<K, DS> => {
  return slice({
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
      updateSync(sl, store, prevStoreState) {
        //  ts is unable to deal with DS as part of the type
        let _store: ReducedStore<typeof sl> = store;
        let _prevState: ReducedStore<typeof sl>['state'] = prevStoreState;

        if (sl.getState(_store.state).ready && !sl.getState(_prevState).ready) {
          cb(store.state, store.dispatch);
        }
      },
    },
  });
};

import { CORE_ACTION_ON_READY } from './constants';
import { key, slice } from './create';
import type { Slice } from './slice';
import type { StoreState } from './state';
import type { ReducedStore } from './store';
import type { ExtractReturnTypes } from './types';

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
      [CORE_ACTION_ON_READY]: () => () => ({
        ready: true,
      }),
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

export type ExtractSliceFromEffectSelectors<
  ES extends Record<string, [Slice, (storeState: StoreState) => any]>,
> = ES extends Record<string, [infer S, (storeState: StoreState) => any]>
  ? S
  : never;

export const baseChangeEffect = <
  K extends string,
  ES extends Record<string, [Slice, (storeState: StoreState) => any]>,
>(
  name: K,
  effectSelectors: ES,
  cb: (
    selectedVal: ExtractReturnTypes<{
      [K in keyof ES]: ES[K][1];
    }>,
    dispatch: ReducedStore<ExtractSliceFromEffectSelectors<ES>>['dispatch'],
    signal: AbortSignal,
  ) => void | (() => void) | Promise<void>,
  isSync = false,
) => {
  const array = Object.entries(effectSelectors).map(
    (r): [string, (storeState: StoreState) => any] => [r[0], r[1][1]],
  );

  let prevCleanup: void | (() => void);
  let prevAbort: AbortController = new AbortController();

  const run = (
    sl: Slice,
    store: ReducedStore<any>,
    prevStoreState: StoreState,
  ) => {
    let hasNew = false;
    const firstRun =
      sl.getState(store.state).ready && !sl.getState(prevStoreState).ready;

    let result = array.map(([k, v]) => {
      const newVal = v(store.state);
      const oldVal = v(prevStoreState);

      if (!Object.is(newVal, oldVal)) {
        hasNew = true;
      }

      return [k, newVal];
    });

    if (hasNew || firstRun) {
      prevCleanup?.();

      if (!isSync) {
        prevAbort?.abort();
      }
      // so that abort is called before running the next
      queueMicrotask(() => {
        if (!isSync) {
          prevAbort = new AbortController();
        }
        let res = cb(
          Object.fromEntries(result),
          store.dispatch,
          prevAbort.signal,
        );

        if (typeof res === 'function') {
          prevCleanup = res;
        }
      });
    }
  };
  let result = slice({
    key: key(
      name,
      Object.values(effectSelectors).map((r) => r[0]),
      {
        ready: false,
      },
    ),
    actions: {
      [CORE_ACTION_ON_READY]: () => () => ({
        ready: true,
      }),
    },
    effects: {
      update(sl, store, prevStoreState) {
        if (!isSync) {
          run(sl, store, prevStoreState);
        }
      },
      updateSync(sl, store, prevStoreState) {
        if (isSync) {
          run(sl, store, prevStoreState);
        }
      },
    },
  });

  return result;
};

export const changeEffect = <
  K extends string,
  ES extends Record<string, [Slice, (storeState: StoreState) => any]>,
>(
  name: K,
  effectSelectors: ES,
  cb: (
    selectedVal: ExtractReturnTypes<{
      [K in keyof ES]: ES[K][1];
    }>,
    dispatch: ReducedStore<ExtractSliceFromEffectSelectors<ES>>['dispatch'],
    signal: AbortSignal,
  ) => void | (() => void) | Promise<void>,
) => {
  return baseChangeEffect(name, effectSelectors, cb, false);
};

export const changeEffectSync = <
  K extends string,
  ES extends Record<string, [Slice, (storeState: StoreState) => any]>,
>(
  name: K,
  effectSelectors: ES,
  cb: (
    selectedVal: ExtractReturnTypes<{
      [K in keyof ES]: ES[K][1];
    }>,
    dispatch: ReducedStore<ExtractSliceFromEffectSelectors<ES>>['dispatch'],
  ) => void | (() => void) | Promise<void>,
) => {
  return baseChangeEffect(name, effectSelectors, cb, true);
};

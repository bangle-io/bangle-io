import { AppState } from './app-state';
import type {
  BaseAction,
  ExtractAction,
  Slice,
  SliceSideEffect,
} from './app-state-slice';
import type { ApplicationStore } from './app-store';
import { abortableSetInterval } from './helper';

const keys: { [k: string]: number } = Object.create(null);

export function createKey(name: string) {
  if (name in keys) {
    return name + '$' + ++keys[name];
  }
  keys[name] = 0;

  return name + '$';
}

export class SliceKey<
  SL = any,
  A extends BaseAction = any,
  S = SL,
  C extends { [key: string]: any } = any,
> {
  key: string;

  constructor(public name: string) {
    this.key = createKey(name);
  }

  // serialization type helpers
  actionSerializer<ANAME extends A['name'], T>(
    actionName: ANAME,
    // return the serialzed 'value' of the action
    toJSON: (action: ExtractAction<A, ANAME>) => T,
    // return the parsed 'value' of the action
    fromJSON: (serialActionValue: T) => ExtractAction<A, ANAME>['value'],
  ) {
    return {
      toJSON,
      fromJSON,
    };
  }

  // Helper function for creating an operation with the correct
  asyncOp<T extends Promise<any>>(
    cb: (
      state: AppState<S, A>,
      dispatch: ApplicationStore<SL, A>['dispatch'],
      store: ApplicationStore<SL, A>,
    ) => T,
  ) {
    return cb;
  }

  callAsyncOp<T>(
    store: ApplicationStore,
    asyncOp: (
      state: AppState,
      dispatch: ApplicationStore['dispatch'],
      store: ApplicationStore,
    ) => T,
  ) {
    return asyncOp(store.state, store.dispatch, store);
  }

  callOp<T>(
    state: AppState,
    dispatch: ApplicationStore['dispatch'],
    op: (state: AppState, dispatch: ApplicationStore['dispatch']) => T,
  ) {
    return op(state, dispatch);
  }

  callQueryOp<T>(state: AppState, queryOp: (state: AppState) => T) {
    return queryOp(state);
  }

  /**
   * A deferred (runs at a slower cadence, just like deferredUpdate) version of `.reactor`
   * Prefer this over `.reactor` unless you know what you are doing.
   */
  deferredReactor<T extends Record<string, (arg: AppState) => any>>(
    dependencyMap: T,
    cb: (
      store: ApplicationStore<SL, A>,
      selected: ExtractReturnTypes<T>,
    ) => void,
  ): SliceSideEffect<SL, A, C> {
    return this.effect(() => {
      return {
        deferredUpdate(store, prevState) {
          handleReactor(dependencyMap, store, prevState, cb);
        },
      };
    });
  }

  // return[1] - the first dependency name that change
  didChange<K extends keyof SL>(
    state: AppState | Readonly<AppState>,
    prevState: AppState | Readonly<AppState>,
  ) {
    return <T extends K[]>(...dependencies: [...T]) => {
      let changed = false;
      let fieldChanged: K | undefined = undefined;

      dependencies.forEach((field) => {
        if (!changed) {
          changed = this.valueChanged(field, state, prevState);

          if (changed) {
            fieldChanged = field;
          }
        }
      });

      return [changed, fieldChanged];
    };
  }

  // Helper function create a side effect with the correct type.
  effect(cb: SliceSideEffect<SL, A, C>) {
    return cb;
  }

  getDispatch(
    dispatch: ApplicationStore['dispatch'],
  ): ApplicationStore<SL, A>['dispatch'] {
    return dispatch as ApplicationStore<SL, A>['dispatch'];
  }

  getSlice(
    state: AppState<S, A> | Readonly<AppState<S, A>>,
  ): Slice<SL, A, S, C> | undefined {
    return state.getSliceByKey(this.key);
  }

  getSliceState(state: AppState | Readonly<AppState>): SL | undefined {
    return state.getSliceState(this.key);
  }

  getSliceStateAsserted(state: AppState | Readonly<AppState>): SL {
    const sliceState: SL | undefined = state.getSliceState(this.key);

    if (sliceState === undefined) {
      throw new Error(`Slice state for "${this.key}"" cannot be undefined`);
    }

    return sliceState;
  }

  getState(
    storeOrState: ApplicationStore | AppState,
  ): ApplicationStore<SL, A>['state'] {
    if (storeOrState instanceof AppState) {
      return storeOrState;
    }

    return this.getStore(storeOrState).state;
  }

  // is a type helper to make it easy calling external operations
  getStateAndDispatch(store: ApplicationStore) {
    return {
      state: this.getState(store),
      dispatch: this.getDispatch(store.dispatch),
    };
  }

  // while keeping TS happy.
  getStore(store: ApplicationStore): ApplicationStore<SL, A> {
    return store;
  }

  //  use `valueChanged` if you expect `undefined` to be a valid value.
  getValueIfChanged<T extends keyof SL>(
    field: T,
    state: AppState | Readonly<AppState>,
    prevState: AppState | Readonly<AppState>,
  ): SL[T] | undefined {
    return this.valueChanged(field, state, prevState)
      ? this.getSliceStateAsserted(state)[field]
      : undefined;
  }

  /**
   *  Runs a callback once every `timer` milliseconds. Auto cleans up when the store is destroyed.
   *
   * @param timer - the time in millisecond of the interval
   * @param cb
   * @returns
   */
  intervalRunEffect(
    timer: number,
    cb: (
      store: ApplicationStore<SL, A>,
      storeDestroyedSignal: AbortSignal,
    ) => void,
  ) {
    return this.effect(() => {
      return {
        deferredOnce(store, abortSignal) {
          abortableSetInterval(
            () => {
              cb(store, abortSignal);
            },
            abortSignal,
            timer,
          );
        },
      };
    });
  }

  // types.
  op<T>(
    cb: (
      state: AppState<S, A>,
      dispatch: ApplicationStore<SL, A>['dispatch'],
    ) => T,
  ) {
    return cb;
  }

  // types.
  queryOp<T>(cb: (state: AppState<S, A>) => T) {
    return cb;
  }

  /**
   * A shorthand for creating a particular type of effect - which runs whenever provided dependencies change.
   * Note: prefer `.deferredReactor` unless you know what you are doing.
   * Note: it only runs if and only if dependencies change.
   * Warning: Be careful not to trigger infinite loop by changing the data which dependency map
   * is watching. Generally avoid putting the same data that you are modifying in the dependency map.
   *
   * @param dependencyMap triggers the callback whenever any of the fields value
   *                    in the dependencyMap changes.
   * @param cb - called with dispatch, the selected fields and the slice state.
   */
  reactor<T extends Record<string, (arg: AppState) => any>>(
    dependencyMap: T,
    cb: (
      state: ApplicationStore<SL, A>['state'],
      dispatch: ApplicationStore<SL, A>['dispatch'],
      selected: ExtractReturnTypes<T>,
    ) => void,
  ): SliceSideEffect<SL, A, C> {
    return this.effect(() => {
      return {
        update(store, prevState) {
          handleReactor(
            dependencyMap,
            store,
            prevState,
            (store, newSelectedData) =>
              cb(store.state, store.dispatch, newSelectedData),
          );
        },
      };
    });
  }

  select<K extends keyof SL>(field: K): (state: AppState) => SL[K] {
    return (state: AppState) => this.getSliceStateAsserted(state)[field];
  }

  // Helper function for creating an operation with the correct
  valueChanged(
    field: keyof SL,
    state: AppState | Readonly<AppState>,
    prevState: AppState | Readonly<AppState>,
  ): boolean {
    return (
      this.getSliceStateAsserted(state)[field] !==
      this.getSliceStateAsserted(prevState)[field]
    );
  }

  // gets the value if it was different from prevState
  // WARNING! it will return undefined if the value is the same
  //  which can be problematic if your field can have `undefined`.

  // Similar to getValueIfChanged but instead takes a list of dependencies
  // and returns a two tuple of whether there was any change and the first field that changed.
  // return[0] - true if any of them changed
}

type ExtractReturnTypes<T extends Record<string, (...args: any[]) => any>> = {
  [K in keyof T]: T[K] extends (i: any) => infer R ? R : never;
};

const handleReactor = <
  T extends Record<string, (arg: AppState) => any>,
  SL = any,
  A extends BaseAction = any,
>(
  dependencyMap: T,
  store: ApplicationStore<SL, A>,
  prevState: AppState,
  cb: (store: ApplicationStore<SL, A>, selected: ExtractReturnTypes<T>) => void,
) => {
  const state = store.state;
  for (const calcState of Object.values(dependencyMap)) {
    const newVal = calcState(state);
    const oldVal = calcState(prevState);

    if (newVal !== oldVal) {
      const newSelectedData = Object.fromEntries(
        Array.from(Object.entries(dependencyMap)).map(([k, v]) => [
          k,
          v(state),
        ]),
      ) as ExtractReturnTypes<T>;

      cb(store, newSelectedData);
      break;
    }
  }
};

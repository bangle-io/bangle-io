import { AppState } from './app-state';
import type {
  BaseAction,
  ExtractAction,
  Slice,
  SliceSideEffect,
} from './app-state-slice';
import { ApplicationStore } from './app-store';

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

  // is a type helper to make it easy calling external operations
  // while keeping TS happy.
  getStore(store: ApplicationStore): ApplicationStore<SL, A> {
    return store;
  }

  getStateAndDispatch(store: ApplicationStore) {
    return {
      state: this.getState(store),
      dispatch: this.getDispatch(store.dispatch),
    };
  }

  getDispatch(
    dispatch: ApplicationStore<any, any>['dispatch'],
  ): ApplicationStore<SL, A>['dispatch'] {
    return dispatch as ApplicationStore<SL, A>['dispatch'];
  }

  getState(
    storeOrState: ApplicationStore | AppState,
  ): ApplicationStore<SL, A>['state'] {
    if (storeOrState instanceof AppState) {
      return storeOrState;
    }
    return this.getStore(storeOrState).state;
  }

  getSliceState(
    state: AppState<any, any> | Readonly<AppState<any, any>>,
  ): SL | undefined {
    return state.getSliceState(this.key);
  }

  getSliceStateAsserted(
    state: AppState<any, any> | Readonly<AppState<any, any>>,
  ): SL {
    const sliceState: SL | undefined = state.getSliceState(this.key);
    if (sliceState === undefined) {
      throw new Error(`Slice state for "${this.key}"" cannot be undefined`);
    }
    return sliceState;
  }

  getSlice(
    state: AppState<S, A> | Readonly<AppState<S, A>>,
  ): Slice<SL, A, S, C> | undefined {
    return state.getSliceByKey(this.key);
  }

  valueChanged(
    field: keyof SL,
    state: AppState<any, any> | Readonly<AppState<any, any>>,
    prevState: AppState<any, any> | Readonly<AppState<any, any>>,
  ): boolean {
    return (
      this.getSliceStateAsserted(state)[field] !==
      this.getSliceStateAsserted(prevState)[field]
    );
  }

  // gets the value if it was different from prevState
  getValueIfChanged<T extends keyof SL>(
    field: T,
    state: AppState<any, any> | Readonly<AppState<any, any>>,
    prevState: AppState<any, any> | Readonly<AppState<any, any>>,
  ): SL[T] | undefined {
    return this.valueChanged(field, state, prevState)
      ? this.getSliceStateAsserted(state)[field]
      : undefined;
  }

  didChange<K extends keyof SL>(
    state: AppState<any, any> | Readonly<AppState<any, any>>,
    prevState: AppState<any, any> | Readonly<AppState<any, any>>,
  ) {
    return <T extends Array<K>>(...arr: [...T]) => {
      let changed = false;
      let fieldChanged: K | undefined = undefined;

      arr.forEach((field) => {
        if (changed === false) {
          changed = this.valueChanged(field, state, prevState);
          if (changed === true) {
            fieldChanged = field;
          }
        }
      });

      return [changed, fieldChanged];
    };
  }

  // Helper function for creating an operation with the correct
  // types.
  op<T>(
    cb: (
      state: AppState<S, A>,
      dispatch: ApplicationStore<SL, A>['dispatch'],
    ) => T,
  ) {
    return cb;
  }

  // Helper function for creating an operation with the correct
  // types.
  queryOp<T>(cb: (state: AppState<S, A>) => T) {
    return cb;
  }

  asyncOp<T extends Promise<any>>(
    cb: (
      state: AppState<S, A>,
      dispatch: ApplicationStore<SL, A>['dispatch'],
      store: ApplicationStore<SL, A>,
    ) => T,
  ) {
    return cb;
  }

  // Helper function create a side effect with the correct type.
  effect(cb: SliceSideEffect<SL, A, C>) {
    return cb;
  }

  // serialization type helpers
  actionSerializer<ANAME extends A['name'], T>(
    actionName: ANAME,
    // return the serialzed value of the action
    toJSON: (action: ExtractAction<A, ANAME>) => T,
    // return the parsed value of the action
    fromJSON: (serialActionValue: T) => ExtractAction<A, ANAME>['value'],
  ) {
    return {
      toJSON,
      fromJSON,
    };
  }
}

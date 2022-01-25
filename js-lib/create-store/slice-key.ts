import type { AppState } from './app-state';
import type { BaseAction, Slice, SliceSideEffect } from './app-state-slice';
import { ApplicationStore } from './app-store';

const keys: { [k: string]: number } = Object.create(null);

export function createKey(name) {
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
  getStore(store: ApplicationStore) {
    return store as ApplicationStore<SL, A>;
  }

  getDispatch(
    dispatch: ApplicationStore<any, any>['dispatch'],
  ): ApplicationStore<SL, A>['dispatch'] {
    return dispatch as ApplicationStore<SL, A>['dispatch'];
  }

  getState(store: ApplicationStore): ApplicationStore<SL, A>['state'] {
    return this.getStore(store).state;
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
}

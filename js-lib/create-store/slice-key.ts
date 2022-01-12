import type { AppState } from './app-state';
import type { BaseAction, Slice } from './app-state-slice';
import { ApplicationStore } from './app-store';

const keys: { [k: string]: number } = Object.create(null);

export function createKey(name) {
  if (name in keys) {
    return name + '$' + ++keys[name];
  }
  keys[name] = 0;
  return name + '$';
}

export class SliceKey<SL = any, A extends BaseAction = any, S = SL> {
  key: string;

  constructor(public name: string) {
    this.key = createKey(name);
  }

  // is a type helper to make it easy calling external operations
  // while keeping TS happy.
  getStore(store: ApplicationStore) {
    return store as ApplicationStore<SL, A>;
  }

  getDispatch(store: ApplicationStore): ApplicationStore<SL, A>['dispatch'] {
    return this.getStore(store)['dispatch'];
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
    if (!sliceState) {
      throw new Error(`Slice state for "${this.key}"" cannot be undefined`);
    }
    return sliceState;
  }

  getSlice(
    state: AppState<S, A> | Readonly<AppState<S, A>>,
  ): Slice<SL, A, S> | undefined {
    return state.getSliceByKey(this.key);
  }
}

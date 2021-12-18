import type { AppState } from './app-state';
import type { BaseAction, Slice } from './app-state-slice';

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

  getSliceState(
    state: AppState<any, any> | Readonly<AppState<any, any>>,
  ): SL | undefined {
    return state.getSliceState(this.key);
  }

  getSlice(
    state: AppState<S, A> | Readonly<AppState<S, A>>,
  ): Slice<SL, A, S> | undefined {
    return state.getSliceByKey(this.key);
  }
}

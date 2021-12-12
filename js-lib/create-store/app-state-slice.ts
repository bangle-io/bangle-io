import type { AppState } from './app-state';
import type { ApplicationStore } from './app-store';
import type { SliceKey } from './slice-key';
import { createKey } from './slice-key';

// A - action
// SL - Slice's state
// S - AppState
export interface SliceStateField<SL, A, S> {
  init(
    this: Slice<SL, A, S>,
    config: { [key: string]: any },
    appState: AppState<S, A>,
  ): SL;
  apply?(
    this: Slice<SL, A, S>,
    action: A,
    value: SL,
    appState: AppState<S, A>,
  ): SL;

  toJSON?: ((this: Slice<SL, A, S>, value: SL) => any) | null | undefined;
  fromJSON?:
    | ((
        this: Slice<SL, A, S>,
        config: { [key: string]: any },
        value: SL,
        appState: AppState<S, A>,
      ) => any)
    | null
    | undefined;
}

export type SliceSideEffect<SL, A, S> = (store: ApplicationStore<S, A>) => {
  update?: (
    store: ApplicationStore<S, A>,
    prevState: AppState<S, A>,
    sliceState: SL,
    prevSliceState: SL,
  ) => void;
  destroy?: () => void;
  deferredUpdate?: (
    store: ApplicationStore<S, A>,
    abortSignal: AbortSignal,
  ) => void;
};

export class Slice<SL, A = any, S = SL> {
  key: string;

  constructor(
    public spec: {
      key?: SliceKey<SL, A, S>;
      state?: SliceStateField<SL, A, S>;
      sideEffect?: SliceSideEffect<SL, A, S> | SliceSideEffect<SL, A, S>[];
    },
  ) {
    this.key = spec.key ? spec.key.key : createKey('slice');
  }

  getSliceState(state: AppState<S, A>): SL | undefined {
    return state.getSliceState(this.key);
  }
}

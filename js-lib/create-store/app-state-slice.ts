import type { JsonObject, JsonValue } from 'type-fest';

import type { AppState } from './app-state';
import type { ApplicationStore } from './app-store';
import type { SliceKey } from './slice-key';
import { createKey } from './slice-key';

type BaseBaseAction = {
  name: string;
  value?: { [k: string]: any };
};

export interface BaseAction extends BaseBaseAction {}

// A - action
// SL - Slice's state
// S - AppState
export interface SliceStateField<SL, A extends BaseAction, S> {
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

  stateToJSON?: (this: Slice<SL, A, S>, value: SL) => JsonValue;
  stateFromJSON?: (
    this: Slice<SL, A, S>,
    config: { [key: string]: any },
    value: JsonValue,
    appState: AppState<S, A>,
  ) => SL;
}

export type SliceSideEffect<SL, A extends BaseAction, S = SL> = (
  store: ApplicationStore<S, A>,
) => {
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

export class Slice<SL, A extends BaseAction = any, S = SL> {
  key: string;

  constructor(
    public spec: {
      key?: SliceKey<SL, A, S>;
      state?: SliceStateField<SL, A, S>;
      // false if it cannot be serialized
      actions?: {
        [K in A['name']]: {
          description?: string;
          toJson: (action: A extends { name: K } ? A : never) => JsonValue;
          fromJson: (
            name: K,
            serializedVal: JsonObject,
          ) => A extends { name: K } ? A : never;
        };
      };
      sideEffect?: SliceSideEffect<SL, A, S> | SliceSideEffect<SL, A, S>[];
    },
  ) {
    this.key = spec.key ? spec.key.key : createKey('slice');
  }

  getSliceState(state: AppState<S, A>): SL | undefined {
    return state.getSliceState(this.key);
  }
}

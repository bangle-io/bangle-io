import type { JsonValue } from 'type-fest';

import type { AppState } from './app-state';
import type { ApplicationStore } from './app-store';
import type { SliceKey } from './slice-key';
import { createKey } from './slice-key';

type BaseBaseAction = {
  name: string;
  value?: { [k: string]: any };
  id?: string;
  fromStore?: string;
  appendedFrom?: string;
};

export type OnErrorType<SL, A extends BaseAction> = (
  error: Error,
  store: ApplicationStore<SL, A>,
) => boolean;

export interface BaseAction extends BaseBaseAction {}

// A - action
// SL - Slice's state
// S - AppState
export interface SliceStateField<
  SL,
  A extends BaseAction,
  S,
  C extends { [key: string]: any } = any,
> {
  init: (this: Slice<SL, A, S>, config: C, appState: AppState<S, A>) => SL;
  apply?: (
    this: Slice<SL, A, S>,
    action: A,
    value: SL,
    appState: AppState<S, A>,
  ) => SL;

  stateToJSON?: (this: Slice<SL, A, S>, value: SL) => JsonValue;
  stateFromJSON?: (
    this: Slice<SL, A, S>,
    config: C,
    value: JsonValue,
    appState: AppState<S, A>,
  ) => SL;
}

export type SliceSideEffect<
  SL,
  A extends BaseAction,
  C extends { [key: string]: any } = any,
> = (
  state: AppState<SL, A>,
  opts: C,
) => {
  // Called once during the lifetime of an effect
  // Though not guaranteed to be run first among other methods, it
  // generally runs around the start of the effect.
  deferredOnce?: (
    store: ApplicationStore<SL, A>,
    // the signal is for destruction of the store. Put in any cleanups in the 'abort' signal
    abortSignal: AbortSignal,
  ) => Promise<void> | void;
  update?: (
    store: ApplicationStore<SL, A>,
    prevState: AppState<SL, A>,
    sliceState: SL,
    prevSliceState: SL,
  ) => void;

  // called when store is destroyed
  destroy?: () => void;

  // will be called after a state update has been applied, it is not guaranteed
  // that this will be called right after the state update
  deferredUpdate?: (
    store: ApplicationStore<SL, A>,
    // previously seen state, if running for first time, this is the initial state
    prevState: ApplicationStore<SL, A>['state'],
    // signal is called if a new deferredUpdate will be called, use this signal for aborting
    // any async methods.
    abortSignal: AbortSignal,
  ) => Promise<void> | void;
};

export class Slice<
  SL = any,
  A extends BaseAction = any,
  S = SL,
  C extends { [key: string]: any } = any,
> {
  key: string;

  constructor(
    public spec: {
      key?: SliceKey<SL, A, S, C>;
      state?: SliceStateField<SL, A, S>;
      appendAction?: (
        actions: A[],
        state: AppState<S, A>,
      ) => BaseAction | undefined;
      // false if it cannot be serialized
      actions?: ActionsSerializersType<A>;
      sideEffect?: SliceSideEffect<SL, A, C> | Array<SliceSideEffect<SL, A, C>>;
      onError?: OnErrorType<SL, A>;
    },
  ) {
    this.key = spec.key ? spec.key.key : createKey('slice');
  }

  getSliceState(state: AppState<S, A>): SL | undefined {
    return state.getSliceState(this.key);
  }
}

export type ActionsSerializersType<A extends BaseAction> = {
  [K in A['name']]: (act: K) => {
    description?: string;
    // Some TS ugliness ahead
    // To modify heres a cheat sheet
    // `A extends { name: K } ? A : never` - to get the correct action, where K is the action.name
    // `A['value'] extends undefined` - exists to avoid action which have undefined value
    toJSON: (action: A extends { name: K } ? A : never) =>
      | false // false if action cannot be serialized
      | (A extends {
          name: K;
        }
          ? A['value'] extends undefined
            ? undefined
            : {
                [KK in keyof A['value']]: JsonValue;
              }
          : never);

    fromJSON: (
      serializedVal: any,
    ) => false | (A extends { name: K } ? A['value'] : never);
  };
};

export type ExtractAction<A, R> = Extract<A, { name: R }>;

export type ExtractActionValue<
  A extends { name: any; value: any },
  R,
> = ExtractAction<A, R>['value'];

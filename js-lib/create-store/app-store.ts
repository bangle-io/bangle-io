import { isAbortError } from '@bangle.io/is-abort-error';

import type { AppState } from './app-state';
import type {
  ActionsSerializersType,
  BaseAction,
  OnErrorType,
  SliceSideEffect,
} from './app-state-slice';

const seenErrors = new WeakSet<Error>();

const errorOwnerSlice = new WeakMap<Error, string>();

export type SchedulerType = (cb: () => void) => () => void;

export type DispatchType<S, A extends BaseAction> = ApplicationStore<
  S,
  A
>['dispatch'];

type StoreSideEffectType<SL, A extends BaseAction, S> = {
  key: string;
  initialState: AppState<S, A>;
  effect: ReturnType<SliceSideEffect<SL, A>>;
};

type DispatchActionType<S, A extends BaseAction> = (
  store: ApplicationStore<S, A>,
  action: A,
) => void;

export type SerializedAction = {};

// time in ms, to check how many errors have been thrown since last time.
// Keep them multiple of 10 please
export const INFINITE_ERROR_THRESHOLD_TIME = 500;
export const INFINITE_ERROR_SAMPLE = 10;

export class ApplicationStore<S = any, A extends BaseAction = any> {
  static create<S = any, A extends BaseAction = any>({
    storeName,
    state,
    scheduler,
    dispatchAction = (store, action) => {
      let newState = store.state.applyAction(action);
      store.updateState(newState);
    },
    disableSideEffects = false,
    onError = (error, store) => {
      return store.runSliceErrorHandlers(error);
    },
  }: {
    state: AppState<S, A>;
    dispatchAction?: DispatchActionType<S, BaseAction>;
    scheduler?: SchedulerType;
    storeName: string;
    disableSideEffects?: boolean;
    onError?: OnErrorType<S, A>;
  }) {
    return new ApplicationStore(
      state,
      dispatchAction,
      storeName,
      scheduler,
      disableSideEffects,
      onError,
    );
  }

  dispatch = (action: A) => {
    if (this._destroyed) {
      return;
    }

    (action as any).id = this.storeName + '-' + incrementalId();

    this._dispatchAction(this, action);
  };

  errorHandler = (error: Error, key?: string): void => {
    if (seenErrors.has(error)) {
      console.warn('Error already seen', error);

      return;
    }

    if (typeof key === 'string') {
      errorOwnerSlice.set(error, key);
    }

    seenErrors.add(error);

    if (this._destroyController.signal.aborted) {
      console.error(error);

      throw new Error('Error after store was destroyed');
    }

    this._infiniteErrors.count++;

    console.debug('store handling error:', error.message, this._infiniteErrors);

    if (this._infiniteErrors.count % INFINITE_ERROR_SAMPLE === 0) {
      if (
        Date.now() - this._infiniteErrors.lastSeen <=
        INFINITE_ERROR_THRESHOLD_TIME
      ) {
        this.destroy();
        console.log(`this.infiniteErrors ${this._infiniteErrors.count}`);
        console.error(error);
        throw new Error('AppStore: avoiding possible infinite errors');
      }
      this._infiniteErrors.lastSeen = Date.now();
    }

    if (isAbortError(error)) {
      return;
    }

    // check the store handler first
    if (this._onError?.(error, this) === true) {
      return;
    }

    throw error;
  };

  private _actionSerializers: {
    [k: string]: ReturnType<
      ActionsSerializersType<any>[keyof ActionsSerializersType<any>]
    >;
  } = {};

  private _currentRunId = 0;
  private _deferredRunner: undefined | DeferredSideEffectsRunner<S, A>;
  private _destroyController = new AbortController();
  private _destroyed = false;
  private _infiniteErrors = {
    count: 0,
    lastSeen: 0,
  };

  private _lastSeenStateCache = new WeakMap<
    StoreSideEffectType<any, A, S>,
    AppState<S, A>
  >();

  private _sideEffects: Array<StoreSideEffectType<any, A, S>> = [];
  constructor(
    private _state: AppState<S, A>,
    private _dispatchAction: DispatchActionType<S, A>,
    public storeName: string,
    private _scheduler?: SchedulerType,
    private _disableSideEffects = false,
    private _onError?: OnErrorType<S, A>,
  ) {
    this._setup();
  }

  get destroyed() {
    return this._destroyed;
  }

  get state(): AppState<S, A> {
    return this._state;
  }

  destroy() {
    this._destroyController.abort();
    this._destroySideEffects();
    this._destroyed = true;
  }

  parseAction({
    name,
    serializedValue,
    storeName,
  }: {
    name: string;
    serializedValue: any;
    storeName: string;
  }): A | false {
    const serializer = this._actionSerializers[name];

    if (!serializer) {
      // console.debug('ActionSerialization: No parser found for ' + name);
      return false;
    }

    const value = serializer.fromJSON(serializedValue);

    if (value === false) {
      // console.debug('ActionSerialization: Parser didnt parse ' + name);
      return false;
    }

    const action = {
      name: name,
      value: value,
      fromStore: storeName,
    };

    return action as A;
  }

  /**
   * gives each slice a chance to handle the error
   * ideally this is run in your stores `.onError` handler callback.
   * @param error
   * @returns true if error was handled and false if no slice could handle it
   */
  runSliceErrorHandlers(error: Error): boolean {
    const key = errorOwnerSlice.get(error);

    //  give priority to the slice it originated from
    if (typeof key === 'string') {
      const matchSlice = this._state.getSliceByKey<any, any, any>(key);

      if (matchSlice?.spec.onError?.(error, this) === true) {
        return true;
      }
    }
    // Note: We are giving every slice an opportunity to handle the error
    // rather than just the originating slice, because if an effect dispatches an
    // operation of a different slice, just running the originating slice's error handlers
    // will miss the error handling of the slice owning the operation.

    // check if any slice handles it
    for (const slice of this._state.getSlices()) {
      if (
        // avoid calling the originating slice again, since we already called it earlier
        slice.key !== key &&
        slice.spec.onError?.(error, this) === true
      ) {
        return true;
      }
    }

    return false;
  }

  serializeAction(action: A) {
    if (action.fromStore) {
      throw new Error('Cannot serialize an action that came from other store');
    }

    const serializer = this._actionSerializers[action.name];

    if (!serializer) {
      return false;
    }
    const serializedValue = serializer.toJSON(action);

    if (serializedValue === false) {
      return false;
    }

    return { name: action.name, serializedValue, storeName: this.storeName };
  }

  updateState(state: AppState<S, A>) {
    if (this._destroyed) {
      return;
    }

    const prevState = this._state;

    this._state = state;

    if (!this._disableSideEffects) {
      if (prevState.config !== this._state.config) {
        this._setup();
      }
      this._runSideEffects(++this._currentRunId);
    }
  }

  private _destroySideEffects() {
    this._deferredRunner?.abort();
    this._sideEffects.forEach(({ effect }) => {
      effect.destroy?.();
    });
    this._sideEffects = [];
  }

  private _runSideEffects(runId: number) {
    for (const sideEffect of this._sideEffects) {
      // make sure the runId is the currentRunId
      if (runId !== this._currentRunId) {
        return;
      }
      // Some effects can lag behind a couple of state transitions
      // if an effect before them dispatches an action.
      // Note: if it is the first time an effect is running
      // the previouslySeenState would be the initial state
      const previouslySeenState =
        this._lastSeenStateCache.get(sideEffect) || sideEffect.initialState;

      // `previouslySeenState` needs to always be the one that the effect.update has seen before or the initial state.
      // Here we are saving the this.state before calling update, because an update can dispatch an action and
      // causing another run of `runSideEffects`, and giving a stale previouslySeen to those effect update calls.
      this._lastSeenStateCache.set(sideEffect, this.state);

      try {
        // effect.update() call should always be the last in this loop, since it can trigger dispatches
        // which changes the runId causing the loop to break.
        sideEffect.effect.update?.(
          this,
          previouslySeenState,
          this.state.getSliceState(sideEffect.key),
          previouslySeenState.getSliceState(sideEffect.key),
        );
      } catch (err) {
        // avoid disrupting the update calls of other
        // side-effects
        if (err instanceof Error) {
          this.errorHandler(err, sideEffect.key);
        } else {
          throw err;
        }
      }
    }

    if (this._scheduler) {
      this._deferredRunner?.abort();
      this._deferredRunner = new DeferredSideEffectsRunner(
        this._sideEffects,
        this._scheduler,
      );
      this._deferredRunner.run(this, this.errorHandler);
    }
  }

  private _setup() {
    this._setupActionSerializers();
    this._setupSideEffects();
  }

  private _setupActionSerializers() {
    this._actionSerializers = {};

    for (const slice of this._state.getSlices()) {
      const actions = slice.spec.actions;

      if (actions) {
        for (const act in actions) {
          if (this._actionSerializers[act]) {
            throw new Error(`A serializer for ${act} already exists`);
          }
          const actionSerializers = (actions as any)[act];

          if (actionSerializers) {
            this._actionSerializers[act] = actionSerializers(act);
          }
        }
      }
    }
  }

  private _setupSideEffects() {
    if (this._disableSideEffects) {
      return;
    }

    this._destroySideEffects();

    const initialAppSate = this._state;

    let allDeferredOnce: Array<
      [
        string,
        Exclude<
          ReturnType<SliceSideEffect<any, any>>['deferredOnce'],
          undefined
        >,
      ]
    > = [];

    this._state.getSlices().forEach((slice) => {
      if (slice.spec.sideEffect) {
        // since sideEffect can be an array or single
        // flatten it for further use
        ([] as Array<SliceSideEffect<any, A> | undefined>)
          .concat(slice.spec.sideEffect)
          .forEach((sideEffect) => {
            let result = sideEffect?.(initialAppSate, this._state.config.opts);

            if (!this._scheduler && result?.deferredUpdate) {
              throw new RangeError(
                "Scheduler needs to be defined for using Slice's deferredUpdate",
              );
            }

            if (result) {
              this._sideEffects.push({
                effect: result,
                key: slice.key,
                initialState: initialAppSate,
              });

              if (result.deferredOnce) {
                allDeferredOnce.push([slice.key, result.deferredOnce]);
              }
            }
          });
      }
    });

    // run all the once handlers
    allDeferredOnce.forEach(([key, def]) => {
      if (!this._destroyController.signal.aborted) {
        (async () => {
          try {
            await def(this, this._destroyController.signal);
          } catch (error) {
            if (error instanceof Error) {
              this.errorHandler(error, key);
            } else if (isAbortError(error)) {
              return;
            } else {
              throw error;
            }
          }
        })();
      }
    });
  }
}

export class DeferredSideEffectsRunner<S, A extends BaseAction> {
  static deferredLastSeenStateCache = new WeakMap<
    StoreSideEffectType<any, any, any>,
    AppState
  >();

  private _abortController = new AbortController();
  private _cleanupCb: ReturnType<SchedulerType> | undefined;

  constructor(
    private _sideEffects: Array<StoreSideEffectType<any, A, S>>,
    private _scheduler: SchedulerType,
  ) {
    this._abortController.signal.addEventListener(
      'abort',
      () => {
        // If the deferred runner is cancelled, this is needed to call the cleanup function
        // of the scheduler or else the scheduler will continue calling the function we passed
        // in `._scheduler`.
        this._cleanupCb?.();
      },
      {
        once: true,
      },
    );
  }

  abort() {
    this._abortController.abort();
  }

  run(
    store: ApplicationStore<S>,
    errorHandler: ApplicationStore['errorHandler'],
  ) {
    if (this._cleanupCb) {
      throw new RangeError('Cannot re-run finished deferred side effects');
    }

    if (this._isAborted) {
      return;
    }

    this._cleanupCb = this._scheduler(async () => {
      if (this._isAborted) {
        return;
      }

      for await (const _sideEffect of this._sideEffects) {
        if (!this._isAborted) {
          // coverting it to async-iife allows us to handle both sync and async errors
          (async (sideEffect) => {
            try {
              const previouslySeenState =
                DeferredSideEffectsRunner.deferredLastSeenStateCache.get(
                  sideEffect,
                ) || sideEffect.initialState;

              DeferredSideEffectsRunner.deferredLastSeenStateCache.set(
                sideEffect,
                store.state,
              );

              await sideEffect.effect.deferredUpdate?.(
                store,
                previouslySeenState,
                this._abortController.signal,
              );
            } catch (error) {
              if (isAbortError(error)) {
                return;
              } else if (!this._isAborted && error instanceof Error) {
                errorHandler(error, sideEffect.key);
              } else {
                throw error;
              }
            }
          })(_sideEffect);
        }
      }
    });
  }

  private get _isAborted() {
    return this._abortController.signal.aborted;
  }
}

let counter = 0;
function incrementalId() {
  return counter++;
}

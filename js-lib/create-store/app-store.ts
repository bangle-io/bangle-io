import { isAbortError } from '@bangle.io/is-abort-error';

import { AppState } from './app-state';
import type {
  ActionsSerializersType,
  BaseAction,
  OnErrorType,
  SliceSideEffect,
} from './app-state-slice';

export type SchedulerType = (cb: () => void) => () => void;

export type DispatchType<S, A extends BaseAction> = ApplicationStore<
  S,
  A
>['dispatch'];

type StoreSideEffectType<SL, A extends BaseAction, S> = {
  key: string;
  initialState: AppState<S, A>;
  effect: ReturnType<SliceSideEffect<SL, A, S>>;
};

type DispatchActionType<S, A extends BaseAction> = (
  store: ApplicationStore<S, A>,
  action: A,
) => void;

export type SerializedAction<A> = {};

// time in ms, to check how many errors have been thrown since last time.
// Keep them multiple of 10 please
export const INFINITE_ERROR_THRESHOLD_TIME = 500;
export const INFINITE_ERROR_SAMPLE = 10;

export class ApplicationStore<S = any, A extends BaseAction = any> {
  private sideEffects: StoreSideEffectType<any, A, S>[] = [];
  private destroyed = false;

  private deferredRunner: undefined | DeferredSideEffectsRunner<S, A>;
  private actionSerializers: {
    [k: string]: ReturnType<
      ActionsSerializersType<any>[keyof ActionsSerializersType<any>]
    >;
  } = {};
  private currentRunId = 0;
  private destroyController = new AbortController();
  private lastSeenStateCache = new WeakMap<
    StoreSideEffectType<any, A, S>,
    AppState<S, A>
  >();

  static create<S = any, A extends BaseAction = any>({
    storeName,
    state,
    scheduler,
    dispatchAction = (store, action) => {
      let newState = store.state.applyAction(action);
      store.updateState(newState);
    },
    disableSideEffects = false,
    onError,
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

  constructor(
    private _state: AppState<S, A>,
    private _dispatchAction: DispatchActionType<S, A>,
    public storeName: string,
    private scheduler?: SchedulerType,
    private disableSideEffects = false,
    private onError?: OnErrorType<S, A>,
  ) {
    this.setup();
  }

  updateState(state: AppState<S, A>) {
    if (this.destroyed) {
      return;
    }

    const prevState = this._state;

    this._state = state;

    if (!this.disableSideEffects) {
      if (prevState.config !== this._state.config) {
        this.setup();
      }
      this.runSideEffects(++this.currentRunId);
    }
  }

  get state(): AppState<S, A> {
    return this._state;
  }

  dispatch = (action: A) => {
    if (this.destroyed) {
      return;
    }

    (action as any).id = this.storeName + '-' + incrementalId();

    this._dispatchAction(this, action);
  };

  serializeAction(action: A) {
    if (action.fromStore) {
      throw new Error('Cannot serialize an action that came from other store');
    }

    const serializer = this.actionSerializers[action.name];
    if (!serializer) {
      return false;
    }
    const serializedValue = serializer.toJSON(action);

    if (serializedValue === false) {
      return false;
    }

    return { name: action.name, serializedValue, storeName: this.storeName };
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
    const serializer = this.actionSerializers[name];

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
    } as A;

    return action;
  }

  destroy() {
    this.destroyController.abort();
    this.destroySideEffects();
    this.destroyed = true;
  }

  private runSideEffects(runId: number) {
    for (const sideEffect of this.sideEffects) {
      // make sure the runId is the currentRunId
      if (runId !== this.currentRunId) {
        return;
      }
      // Some effects can lag behind a couple of state transitions
      // if an effect before them dispatches an action.
      // Note: if it is the first time an effect is running
      // the previouslySeenState would be the initial state
      const previouslySeenState =
        this.lastSeenStateCache.get(sideEffect) || sideEffect.initialState;

      // `previouslySeenState` needs to always be the one that the effect.update has seen before or the initial state.
      // Here we are saving the this.state before calling update, because an update can dispatch an action and
      // causing another run of `runSideEffects`, and giving a stale previouslySeen to those effect update calls.
      this.lastSeenStateCache.set(sideEffect, this.state);

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

    if (this.scheduler) {
      this.deferredRunner?.abort();
      this.deferredRunner = new DeferredSideEffectsRunner(
        this.sideEffects,
        this.scheduler,
      );
      this.deferredRunner.run(this, this.errorHandler);
    }
  }

  private destroySideEffects() {
    this.deferredRunner?.abort();
    this.sideEffects.forEach(({ effect }) => {
      effect.destroy?.();
    });
    this.sideEffects = [];
  }

  private setup() {
    this.setupActionSerializers();
    this.setupSideEffects();
  }

  private setupActionSerializers() {
    this.actionSerializers = {};

    for (const slice of this._state.getSlices()) {
      const actions = slice.spec.actions;
      if (actions) {
        for (const act in actions) {
          if (this.actionSerializers[act]) {
            throw new Error(`A serializer for ${act} already exists`);
          }
          const actionSerializers = (actions as any)[act];
          if (actionSerializers) {
            this.actionSerializers[act] = actionSerializers(act);
          }
        }
      }
    }
  }

  private setupSideEffects() {
    if (this.disableSideEffects) {
      return;
    }

    this.destroySideEffects();

    const initialAppSate = this._state;

    let allDeferredOnce: [
      string,
      Exclude<ReturnType<SliceSideEffect<any, any>>['deferredOnce'], undefined>,
    ][] = [];

    this._state.getSlices().forEach((slice) => {
      if (slice.spec.sideEffect) {
        // since sideEffect can be an array or single
        // flatten it for further use
        ([] as SliceSideEffect<any, A>[])
          .concat(slice.spec.sideEffect)
          .forEach((sideEffect) => {
            let result = sideEffect?.(initialAppSate, this._state.config.opts);

            if (!this.scheduler && result?.deferredUpdate) {
              throw new RangeError(
                "Scheduler needs to be defined for using Slice's deferredUpdate",
              );
            }

            if (result) {
              this.sideEffects.push({
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
      if (!this.destroyController.signal.aborted) {
        (async () => {
          try {
            await def(this, this.destroyController.signal);
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

  private infiniteErrors = {
    count: 0,
    lastSeen: 0,
  };

  public errorHandler = (error: Error, key?: string): void => {
    if (this.destroyController.signal.aborted) {
      return;
    }

    this.infiniteErrors.count++;

    console.debug('store handling error:', error.message, this.infiniteErrors);

    if (this.infiniteErrors.count % INFINITE_ERROR_SAMPLE === 0) {
      if (
        Date.now() - this.infiniteErrors.lastSeen <=
        INFINITE_ERROR_THRESHOLD_TIME
      ) {
        this.destroy();
        console.log(`this.infiniteErrors ${this.infiniteErrors.count}`);
        console.error(error);
        throw new Error('AppStore: avoiding possible infinite errors');
      }
      this.infiniteErrors.lastSeen = Date.now();
    }

    if (isAbortError(error)) {
      return;
    }

    // check the store handler first
    if (this.onError?.(error, this) === true) {
      return;
    }

    // after that give priority to the slice it originated from
    if (typeof key === 'string') {
      const matchSlice = this._state.getSliceByKey<any, any, any>(key);
      if (matchSlice?.spec.onError?.(error, this) === true) {
        return;
      }
    }
    // Note: We are giving every slice an opportunity to handle the error
    // rather than just the originating slice, because if an effect dispatches an
    // operation of a different slice, just running the orginating slice's error handlers
    // will miss the error handling of the slice owning the operation.

    // check if any slice handles it
    for (const slice of this._state.getSlices()) {
      if (
        // avoid calling the originating slice again, since we already called it earlier
        slice.key !== key &&
        slice.spec.onError?.(error, this) === true
      ) {
        return;
      }
    }

    throw error;
  };
}

export class DeferredSideEffectsRunner<S, A extends BaseAction> {
  private scheduledCallback: ReturnType<SchedulerType> | undefined;

  static deferredlastSeenStateCache = new WeakMap<
    StoreSideEffectType<any, any, any>,
    AppState<any, any>
  >();

  private abortController = new AbortController();

  constructor(
    private sideEffects: Array<StoreSideEffectType<any, A, S>>,
    private scheduler: SchedulerType,
  ) {
    this.abortController.signal.addEventListener('abort', () => {
      this.scheduledCallback?.();
    });
  }

  public abort() {
    this.abortController.abort();
  }

  private get isAborted() {
    return this.abortController.signal.aborted;
  }

  public run(
    store: ApplicationStore<S>,
    errorHandler: ApplicationStore['errorHandler'],
  ) {
    if (this.scheduledCallback) {
      throw new RangeError('Cannot re-run finished deferred side effects');
    }

    if (this.isAborted) {
      return;
    }

    this.scheduledCallback = this.scheduler(async () => {
      if (this.isAborted) {
        return;
      }

      for await (const _sideEffect of this.sideEffects) {
        if (!this.isAborted) {
          // coverting it to async-iife allows us to handle both sync and async errors
          (async (sideEffect) => {
            try {
              const previouslySeenState =
                DeferredSideEffectsRunner.deferredlastSeenStateCache.get(
                  sideEffect,
                ) || sideEffect.initialState;

              DeferredSideEffectsRunner.deferredlastSeenStateCache.set(
                sideEffect,
                store.state,
              );

              await sideEffect.effect.deferredUpdate?.(
                store,
                previouslySeenState,
                this.abortController.signal,
              );
            } catch (error) {
              if (isAbortError(error)) {
                return;
              } else if (!this.isAborted && error instanceof Error) {
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
}

let counter = 0;
function incrementalId() {
  return counter++;
}

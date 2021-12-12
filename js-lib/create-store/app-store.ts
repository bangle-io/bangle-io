import type { JsonValue } from 'type-fest';

import type { AppState } from './app-state';
import type { SliceSideEffect } from './app-state-slice';

export type SchedulerType = (cb: () => void) => () => void;

type StoreSideEffectType<SL, A, S> = {
  key: string;
  effect: ReturnType<SliceSideEffect<SL, A, S>>;
};

export class ApplicationStore<S = any, A = any> {
  private sideEffects: StoreSideEffectType<any, A, S>[] = [];
  private destroyed = false;

  private deferredRunner: undefined | DeferredSideEffectsRunner<S, A>;

  constructor(
    private _state: AppState<S, A>,
    private _dispatchAction: (
      store: ApplicationStore<S, A>,
      action: A,
    ) => void = (store, action) => {
      let newState = store.state.applyAction(action);
      this.updateState(newState);
    },
    private scheduler?: SchedulerType,
  ) {
    this.setupSideEffects();
  }

  updateState(state: AppState<S, A>) {
    if (this.destroyed) {
      return;
    }

    let prevState = this._state;
    this._state = state;

    this.runSideEffects(prevState);
  }

  get state(): AppState<S, A> {
    return this._state;
  }

  dispatch = (action: A & JsonValue) => {
    if (this.destroyed) {
      return;
    }
    this._dispatchAction(this, action);
  };

  destroy() {
    this.destroySideEffects();
    this.destroyed = true;
  }

  private runSideEffects(prevState: AppState<S, A>) {
    if (prevState.config !== this._state.config) {
      this.setupSideEffects();
    }

    this.sideEffects.forEach(({ effect, key }) => {
      effect.update?.(
        this,
        prevState,
        this.state.getSliceState(key),
        prevState.getSliceState(key),
      );
    });

    if (this.scheduler) {
      this.deferredRunner?.abort();
      this.deferredRunner = new DeferredSideEffectsRunner(
        this.sideEffects,
        this.scheduler,
      );
      this.deferredRunner.run(this);
    }
  }

  private destroySideEffects() {
    this.deferredRunner?.abort();
    this.sideEffects.forEach(({ effect }) => {
      effect.destroy?.();
    });
    this.sideEffects = [];
  }

  private setupSideEffects() {
    this.destroySideEffects();

    this._state.getSlices().forEach((slice) => {
      if (slice.spec.sideEffect) {
        // since sideEffect can be an array or single
        // flatten it for further use
        ([] as SliceSideEffect<any, A, S>[])
          .concat(slice.spec.sideEffect)
          .forEach((sideEffect) => {
            let result = sideEffect?.(this);
            if (!this.scheduler && result?.deferredUpdate) {
              throw new RangeError(
                "Scheduler needs to be defined for using Slice's deferredUpdate",
              );
            }
            if (result) {
              this.sideEffects.push({ effect: result, key: slice.key });
            }
          });
      }
    });
  }
}

export class DeferredSideEffectsRunner<S, A> {
  private scheduledCallback: ReturnType<SchedulerType> | undefined;

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

  public run(store: ApplicationStore<S>) {
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
      for await (const { effect } of this.sideEffects) {
        if (!this.isAborted) {
          effect.deferredUpdate?.(store, this.abortController.signal);
        }
      }
    });
  }
}

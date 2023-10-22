import type { BaseStore, InferSliceNameFromStore } from '../base-store';
import { hasIdleCallback } from '../helpers';
import type { DebugLogger } from '../logger';
import type { Store } from '../store';
import type { AnySlice } from '../types';
import type { EffectStore } from './run-instance';
import { RunInstance } from './run-instance';

export type ValidEffectStore<
  TStoreSlices extends string,
  TSliceName extends string,
> = TSliceName extends TStoreSlices ? EffectStore<TStoreSlices> : never;

const DEFAULT_MAX_WAIT = 15;

export type EffectOpts = {
  /**
   * Effects are deferred by default. If set to false, the effect will run immediately after
   * a store state change. If set to true, the effect will run anytime before maxWait.
   */
  deferred: boolean;
  /**
   *
   */
  maxWait: number;
  scheduler: EffectScheduler;
  name?: string;
};

export type EffectScheduler = (
  cb: () => void,
  opts: Omit<EffectOpts, 'scheduler'> & {},
) => void;

const DEFAULT_SCHEDULER: EffectScheduler = (cb, opts) => {
  if (opts.deferred) {
    if (hasIdleCallback) {
      window.requestIdleCallback(cb, { timeout: opts.maxWait });
    } else {
      setTimeout(cb, opts.maxWait);
    }
  } else {
    queueMicrotask(cb);
  }
};

export type EffectCreator = (store: Store) => Effect;

export type EffectCallback<TStore extends BaseStore<any>> = (
  store: EffectStore<InferSliceNameFromStore<TStore>>,
) => void | Promise<void>;

export class Effect {
  private runInstance: RunInstance;

  private debug: DebugLogger | undefined;

  private destroyed = false;

  private pendingRun = false;

  private runCount = 0;

  private scheduler: EffectScheduler;

  name: string;

  constructor(
    private readonly callback: EffectCallback<EffectStore<any>>,
    private readonly rootStore: Store,
    public readonly opts: EffectOpts,
  ) {
    this.name = opts.name || callback.name || 'anonymous';
    this.runInstance = new RunInstance(rootStore, this.name);
    this.debug = rootStore.opts.debug;
    this.scheduler = rootStore.opts.overrideEffectScheduler || opts.scheduler;
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.runInstance = this.runInstance.newRun();
    this.destroyed = true;
  }

  /**
   * If slicesChanged is undefined, it will always run the effect.
   * The effect will also run at least once, regardless of slicesChanged.
   * @param slicesChanged
   * @returns
   */
  run(slicesChanged?: Set<AnySlice>): boolean {
    if (this.pendingRun) {
      return false;
    }

    if (!this.shouldQueueRun(slicesChanged)) {
      return false;
    }

    this.pendingRun = true;
    this.scheduler(() => {
      this._run();
      this.pendingRun = false;
    }, this.opts);

    return true;
  }

  private shouldQueueRun(slicesChanged?: Set<AnySlice>): boolean {
    if (this.destroyed) {
      return false;
    }

    if (slicesChanged === undefined) {
      return true;
    }

    for (const slice of this.runInstance.dependencies.keys()) {
      if (slicesChanged.has(slice)) {
        return true;
      }
    }

    if (this.runCount === 0) {
      return true;
    }

    return false;
  }

  private _run(): void {
    if (this.destroyed) {
      return;
    }

    let fieldChanged: string = '';

    // if runCount is 0, always= run, to ensure the effect runs at least once
    if (this.runCount > 0) {
      const depChanged = this.runInstance.whatDependenciesStateChange();

      if (depChanged === false) {
        return;
      }

      fieldChanged = depChanged;
    }

    const oldInstance = this.runInstance;
    this.runInstance = oldInstance.newRun();

    void this.callback(this.runInstance.effectStore);
    this.debug?.({
      type: this.opts.deferred ? 'UPDATE_EFFECT' : 'SYNC_UPDATE_EFFECT',
      name: this.name,
      changed: fieldChanged,
    });
    this.runCount++;
  }
}

export function effect<TStore extends BaseStore<any>>(
  callback: EffectCallback<TStore>,
  {
    deferred = true,
    maxWait = DEFAULT_MAX_WAIT,
    scheduler = DEFAULT_SCHEDULER,
  }: Partial<EffectOpts> = {},
): EffectCreator {
  return (store: Store) => {
    const newEffect = new Effect(callback, store, {
      deferred,
      maxWait,
      scheduler,
    });

    return newEffect;
  };
}

import { calcReverseDependencies, flattenReverseDependencies } from './common';
import type { Slice } from './slice';
import type { StoreState } from './state';
import type { Store } from './store';
import type { AnySliceBase, EffectsBase } from './types';

export interface Scheduler {
  schedule: (cb: () => void) => void;
}

export const idleCallbackScheduler: (timeout: number) => Scheduler = (
  timeout,
) => ({
  schedule: (cb) => {
    return requestIdleCallback(cb, { timeout });
  },
});

export const timeoutSchedular: (timeout: number) => Scheduler = (timeout) => ({
  schedule: (cb) => {
    return setTimeout(cb, timeout);
  },
});

export const syncSchedular: () => Scheduler = () => ({
  schedule: (cb) => {
    queueMicrotask(cb);
  },
});

export class SideEffectsManager {
  _debugWhoRanEffect = new WeakMap<EffectHandler, string[]>();

  private _effects: {
    queue: {
      syncUpdate: Set<SyncUpdateEffectHandler>;
      update: Set<UpdateEffectHandler>;
    };
    record: {
      syncUpdate: Record<string, SyncUpdateEffectHandler[]>;
      update: Record<string, UpdateEffectHandler[]>;
    };
  } = {
    queue: {
      syncUpdate: new Set(),
      update: new Set(),
    },
    record: {
      syncUpdate: {},
      update: {},
    },
  };

  private _flatReverseDep: Record<string, Set<string>>;

  constructor(
    slices: AnySliceBase[],
    initState: StoreState,
    private _schedular: Scheduler = idleCallbackScheduler(15),
    public readonly debug:
      | ((effect: EffectHandler, originators: string[]) => void)
      | undefined = undefined,
  ) {
    // TODO ensure deps are valid and don't have circular dependencies
    // nice to have if reverse dep are sorted in the order slice are defined
    this._flatReverseDep = flattenReverseDependencies(
      calcReverseDependencies(slices),
    );

    // fill in record of effects
    slices.forEach((slice) => {
      if (slice.effects) {
        this._effects.record.syncUpdate[slice.key.key] = slice.effects.map(
          (effect) => new SyncUpdateEffectHandler(effect, initState, slice),
        );
        this._effects.record.update[slice.key.key] = slice.effects.map(
          (effect) => new UpdateEffectHandler(effect, initState, slice),
        );
      }
    });
  }

  queueSideEffectExecution(
    store: Store<any>,
    {
      txOriginSliceKey,
      txOriginId,
    }: {
      txOriginSliceKey: string;
      txOriginId: string;
    },
  ) {
    this._debugBeforeQueue(txOriginSliceKey, txOriginId);

    const { record, queue } = this._effects;
    // if there are no items in the queue that means
    //    we will need to trigger running of the effects
    // else if there are items, whatever we add to the queue will be run
    //    by the previous run
    // these are  just an optimization to avoid extra microtask calls
    const shouldRunSyncUpdateEffects = queue.syncUpdate.size === 0;
    const shouldRunUpdateEffects = queue.update.size === 0;

    // queue up effects of source slice to run
    record.syncUpdate[txOriginSliceKey]?.forEach((effect) => {
      queue.syncUpdate.add(effect);
    });
    record.update[txOriginSliceKey]?.forEach((effect) => {
      queue.update.add(effect);
    });

    // queue up dependencies's effects to run
    this._flatReverseDep[txOriginSliceKey]?.forEach((revDepKey) => {
      record.syncUpdate[revDepKey]?.forEach((effect) => {
        queue.syncUpdate.add(effect);
      });
      record.update[revDepKey]?.forEach((effect) => {
        queue.update.add(effect);
      });
    });

    if (shouldRunSyncUpdateEffects || shouldRunUpdateEffects) {
      // use microtask so that we yield to the code dispatching the action
      // for example
      //    store.dispatch(action1)
      //    store.state // <-- should be the correct state without interference from effects
      // if didn't queue microtask, the store.state could include more state changes than
      // what the user expected.
      queueMicrotask(() => {
        this._runLoop(store);
      });
    }
  }

  private _debugBeforeQueue(txOriginSliceKey: string, txOriginId: string) {
    if (!this.debug) {
    }
    const { record } = this._effects;

    const setDebug = (effect: EffectHandler) => {
      let result = this._debugWhoRanEffect.get(effect);

      if (!result) {
        result = [];
        this._debugWhoRanEffect.set(effect, result);
      }
      result.push(txOriginId);
    };

    record.syncUpdate[txOriginSliceKey]?.forEach((effect) => {
      setDebug(effect);
    });
    record.update[txOriginSliceKey]?.forEach((effect) => {
      setDebug(effect);
    });

    // queue up dependencies's effects to run
    this._flatReverseDep[txOriginSliceKey]?.forEach((revDepKey) => {
      record.syncUpdate[revDepKey]?.forEach((effect) => {
        setDebug(effect);
      });
      record.update[revDepKey]?.forEach((effect) => {
        setDebug(effect);
      });
    });
  }

  private _debugBeforeRunEffect(effect: EffectHandler) {
    if (!this.debug) {
      return;
    }
    const debugInfo = this._debugWhoRanEffect.get(effect);

    if (debugInfo) {
      this.debug(effect, debugInfo);
    }
    this._debugWhoRanEffect.delete(effect);
  }

  private _runLoop(store: Store<any>) {
    if (store.destroyed) {
      return;
    }

    if (this._effects.queue.syncUpdate.size > 0) {
      this._runSyncUpdateEffects(store);
    }

    if (this._effects.queue.update.size > 0) {
      this._runUpdateEffect(store, () => {
        this._runLoop(store);
      });
    }
  }

  private _runSyncUpdateEffects(store: Store<any>) {
    const { queue } = this._effects;

    // Note that sometimes effects can lag behind a couple of state transitions
    // if an effect before them dispatches an action or externally someone dispatches multiple
    // actions changing the state.
    while (queue.syncUpdate.size > 0 && !store.destroyed) {
      const iter = queue.syncUpdate.values().next();

      if (!iter.done) {
        const effect = iter.value;
        queue.syncUpdate.delete(effect);
        this._debugBeforeRunEffect(effect);

        // TODO: error handling?
        effect.runSyncUpdate(store);
      }
    }
  }

  private _runUpdateEffect(store: Store<any>, onDone: () => void) {
    this._schedular.schedule(() => {
      const { queue } = this._effects;
      const iter = queue.update.values().next();

      if (iter.done || store.destroyed) {
        onDone();

        return;
      }

      const effect = iter.value;
      queue.update.delete(effect);
      this._debugBeforeRunEffect(effect);

      try {
        effect.runUpdate(store);
      } finally {
        onDone();
      }
    });
  }
}

abstract class EffectHandler {
  sliceAndDeps: AnySliceBase[];
  constructor(
    protected _effect: EffectsBase,
    public readonly initStoreState: StoreState,
    protected _slice: AnySliceBase,
  ) {
    this.sliceAndDeps = [...this._slice.key.dependencies, _slice];
  }

  get sliceKey() {
    return this._slice.key.key;
  }
}

export class SyncUpdateEffectHandler extends EffectHandler {
  private _syncPreviouslySeenState: StoreState = this.initStoreState;

  runSyncUpdate(store: Store<any>) {
    // Note: if it is the first time an effect is running this
    // the previouslySeenState would be the initial state
    const previouslySeenState = this._syncPreviouslySeenState;
    // `previouslySeenState` needs to always be the one that the effect.update has seen before or the initial state.
    // Here we are saving the store.state before calling update, because an update can dispatch an action and
    // causing another run of of effects, and giving a stale previouslySeen to those effect update calls.
    this._syncPreviouslySeenState = store.state;

    // TODO error handling
    this._effect.updateSync?.(
      this._slice as Slice,
      store.getReducedStore(this.sliceAndDeps as Slice[]),
      previouslySeenState,
    );
  }
}

export class UpdateEffectHandler extends EffectHandler {
  private _previouslySeen: StoreState = this.initStoreState;

  runUpdate(store: Store<any>) {
    const previouslySeenState = this._previouslySeen;
    this._previouslySeen = store.state;

    // TODO error handling
    this._effect.update?.(
      this._slice as Slice,
      store.getReducedStore(this.sliceAndDeps as Slice[]),
      previouslySeenState,
    );
  }
}

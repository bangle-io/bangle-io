import { calcReverseDependencies, flattenReverseDependencies } from './common';
import type { DebugFunc } from './logging';
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
  _debugWhoRanEffect = new WeakMap<
    EffectHandler,
    Array<{ sliceKey: string; actionId: string }>
  >();

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
    private readonly _debug?: DebugFunc,
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
      sliceKey,
      actionId,
    }: {
      sliceKey: string;
      actionId: string;
    },
  ) {
    this._debugBeforeQueue(sliceKey, actionId);

    const { record, queue } = this._effects;
    // if there are no items in the queue that means
    //    we will need to trigger running of the effects
    // else if there are items, whatever we add to the queue will be run
    //    by the previous run
    // these are  just an optimization to avoid extra microtask calls
    const shouldRunSyncUpdateEffects = queue.syncUpdate.size === 0;
    const shouldRunUpdateEffects = queue.update.size === 0;

    // queue up effects of source slice to run
    record.syncUpdate[sliceKey]?.forEach((effect) => {
      queue.syncUpdate.add(effect);
    });
    record.update[sliceKey]?.forEach((effect) => {
      queue.update.add(effect);
    });

    // queue up dependencies's effects to run
    this._flatReverseDep[sliceKey]?.forEach((revDepKey) => {
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

  private _debugBeforeQueue(sliceKey: string, actionId: string) {
    if (!this._debug) {
    }
    const { record } = this._effects;

    const setDebug = (effect: EffectHandler) => {
      let result = this._debugWhoRanEffect.get(effect);

      if (!result) {
        result = [];
        this._debugWhoRanEffect.set(effect, result);
      }
      result.push({ sliceKey, actionId });
    };

    record.syncUpdate[sliceKey]?.forEach((effect) => {
      setDebug(effect);
    });
    record.update[sliceKey]?.forEach((effect) => {
      setDebug(effect);
    });

    // queue up dependencies's effects to run
    this._flatReverseDep[sliceKey]?.forEach((revDepKey) => {
      record.syncUpdate[revDepKey]?.forEach((effect) => {
        setDebug(effect);
      });
      record.update[revDepKey]?.forEach((effect) => {
        setDebug(effect);
      });
    });
  }

  private _debugBeforeRunEffect(effect: EffectHandler) {
    if (!this._debug) {
      return;
    }
    const debugInfo = this._debugWhoRanEffect.get(effect);

    if (debugInfo) {
      this._debug({
        type: 'EFFECT',
        name: effect.effect.name || '<unknownEffect>',
        source: debugInfo,
      });
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
    public effect: EffectsBase,
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
    this.effect.updateSync?.(
      this._slice as Slice,
      store.getReducedStore(this.sliceAndDeps as Slice[], this.effect.name),
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
    this.effect.update?.(
      this._slice as Slice,
      store.getReducedStore(this.sliceAndDeps as Slice[], this.effect.name),
      previouslySeenState,
    );
  }
}

import type { AnySliceBase, EffectsBase } from './common';
import { calcReverseDependencies, flattenReverseDependencies } from './common';
import type { Slice } from './slice';
import type { StoreState } from './state';
import type { Store } from './store';

interface EffectsLookup {
  queue: {
    syncUpdate: Set<SyncUpdateEffectHandler>;
    update: Set<UpdateEffectHandler>;
  };
  record: {
    syncUpdate: Record<string, SyncUpdateEffectHandler[]>;
    update: Record<string, UpdateEffectHandler[]>;
  };
}

export class SideEffectsManager {
  private _effects: EffectsLookup = {
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

  constructor(slices: AnySliceBase[], initState: StoreState) {
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

  runSideEffects(store: Store<any>, runId: number, sourceSliceKey: string) {
    const { record, queue } = this._effects;
    // queue up effects of source slice to run
    record.syncUpdate[sourceSliceKey]?.forEach((effect) => {
      queue.syncUpdate.add(effect);
    });
    record.update[sourceSliceKey]?.forEach((effect) => {
      queue.update.add(effect);
    });

    // queue up dependencies's effects to run
    this._flatReverseDep[sourceSliceKey]?.forEach((revDepKey) => {
      record.syncUpdate[revDepKey]?.forEach((effect) => {
        queue.syncUpdate.add(effect);
      });
      record.update[revDepKey]?.forEach((effect) => {
        queue.update.add(effect);
      });
    });

    queueMicrotask(() => {
      // make sure the runId is the still the current runId
      // Some effects can lag behind a couple of state transitions
      // if an effect before them dispatches an action.
      while (runId === store.runId && queue.syncUpdate.size > 0) {
        const iter = queue.syncUpdate.values().next();

        if (!iter.done) {
          const effect = iter.value;
          queue.syncUpdate.delete(effect);
          // TODO: error handling?
          effect.runSyncUpdate(store);
        }
      }
    });
  }
}

abstract class EffectHandler {
  constructor(
    protected _effect: EffectsBase,
    public readonly initStoreState: StoreState,
    protected _slice: AnySliceBase,
  ) {}
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
    this._effect.updateSync?.(this._slice as Slice, store, previouslySeenState);
  }
}

export class UpdateEffectHandler extends EffectHandler {
  private _previouslySeen: StoreState = this.initStoreState;

  runUpdate(store: Store<any>) {
    const previouslySeenState = this._previouslySeen;
    this._previouslySeen = store.state;

    // TODO error handling
    this._effect.update?.(this._slice as Slice, store, previouslySeenState);
  }
}

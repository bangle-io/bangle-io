import { Action } from './action';
import { calcReverseDependencies, validateSlices } from './helpers';
import type { Slice } from './slice';
import type { Step, Transaction } from './transaction';
import type { AnySlice, SliceId } from './types';

export type StoreStateOpts<TSliceName extends string> = {
  stateOverride?: Record<SliceId, Record<string, unknown>>;
  slices: Array<Slice<TSliceName, any, any>>;
};

type StoreStateConfig<TSliceName extends string> =
  StoreStateOpts<TSliceName> & {
    slicesLookup: Record<SliceId, Slice<TSliceName, any, any>>;
    storeStateKey: StoreStateKey;
    reverseSliceDependencies: Record<SliceId, Set<SliceId>>;
  };

export class StoreStateKey {
  _storeStateKey = 'StoreStateKey';
}

function computeConfig<TSliceName extends string>(
  opts: StoreStateOpts<TSliceName>,
): StoreStateConfig<TSliceName> {
  const slicesLookup = Object.fromEntries(
    opts.slices.map((slice) => [slice.sliceId, slice]),
  );
  const storeStateKey = new StoreStateKey();

  return {
    ...opts,
    slicesLookup,
    storeStateKey,
    reverseSliceDependencies: calcReverseDependencies(opts.slices),
  };
}

export class SliceStateManager {
  constructor(
    public readonly slice: AnySlice,
    public readonly sliceState: Record<string, unknown>,
  ) {}

  applyStep(
    storeState: StoreState<any>,
    step: Step<any, any>,
  ): StoreState<any> {
    const newSliceState = Action._applyStep(storeState, step);

    if (this.sliceState === newSliceState) {
      return storeState;
    }

    return storeState._updateSliceStateManager(
      new SliceStateManager(this.slice, newSliceState),
    );
  }
}

export class StoreState<TSliceName extends string> {
  static create<TSliceName extends string>(opts: StoreStateOpts<TSliceName>) {
    validateSlices(opts.slices);

    const sliceStateMap: Record<SliceId, SliceStateManager> =
      Object.fromEntries(
        opts.slices.map((slice) => [
          slice.sliceId,
          new SliceStateManager(slice, slice.initialState),
        ]),
      );

    const config = computeConfig(opts);

    if (opts.stateOverride) {
      for (const [sliceId, override] of Object.entries(opts.stateOverride)) {
        const id = sliceId as SliceId;

        if (!sliceStateMap[id]) {
          throw new Error(
            `StoreState.create: slice with id "${id}" does not exist`,
          );
        }
        sliceStateMap[id] = new SliceStateManager(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          config.slicesLookup[id]!,
          override,
        );
      }
    }

    return new StoreState(sliceStateMap, config);
  }

  private resolveCache: Record<SliceId, unknown> = {};
  private constructor(
    private sliceStateMap: Record<SliceId, SliceStateManager>,
    protected config: StoreStateConfig<TSliceName>,
  ) {}

  applyTransaction(txn: Transaction<any>): StoreState<TSliceName> {
    if (txn.isDestroyed) {
      throw new Error(
        `StoreState.applyTransaction: cannot apply a destroyed transaction`,
      );
    }

    return txn.steps.reduce<StoreState<TSliceName>>((storeState, step) => {
      return storeState
        .getSliceStateManager(step.targetSliceId)
        .applyStep(storeState, step);
    }, this);
  }

  getSliceState(sliceId: SliceId): unknown {
    return this.getSliceStateManager(sliceId).sliceState;
  }

  getSliceStateManager(sliceId: SliceId): SliceStateManager {
    const manager = this.sliceStateMap[sliceId];

    if (!manager) {
      throw new Error(
        `StoreState.resolveSliceState: slice with id "${sliceId}" does not exist`,
      );
    }

    return manager;
  }

  /**
   * @internal
   */
  resolve(
    sliceId: SliceId,
    { skipDerivedData }: { skipDerivedData?: boolean } = {},
  ): unknown {
    const sliceStateManager = this.getSliceStateManager(sliceId);

    if (!sliceStateManager.slice.opts.calcDerivedState || skipDerivedData) {
      return sliceStateManager.sliceState;
    }

    const cached = this.resolveCache[sliceId];

    if (cached !== undefined) {
      return cached;
    }

    const derivedState = sliceStateManager.slice.opts.calcDerivedState(this);
    const result = {
      ...sliceStateManager.sliceState,
      ...derivedState,
    };

    this.resolveCache[sliceId] = result;

    return result;
  }

  /**
   * Returns slices that have changed compared to the provided store state.
   * does not take into account slices that were removed in the current store state and exist
   * in the provided store state.
   * @internal
   */
  _getChangedSlices(otherStoreState: StoreState<any>): AnySlice[] {
    const diff: AnySlice[] = [];

    Object.values(this.sliceStateMap).forEach((sliceStateManager) => {
      const slice = sliceStateManager.slice;
      const sliceState = sliceStateManager.sliceState;

      const otherSliceState =
        otherStoreState.sliceStateMap[slice.sliceId]?.sliceState;

      if (sliceState !== otherSliceState) {
        diff.push(sliceStateManager.slice);
      }
    });

    return diff;
  }

  /**
   * @internal
   * A unique key that is shared among all store states of a particular store.
   */
  get _storeStateKey() {
    return this.config.storeStateKey;
  }

  /**
   * @internal
   */
  _updateSliceStateManager(
    sliceStateManager: SliceStateManager,
  ): StoreState<TSliceName> {
    return new StoreState(
      {
        ...this.sliceStateMap,
        [sliceStateManager.slice.sliceId]: sliceStateManager,
      },
      this.config,
    );
  }
}

export class RestrictionManager {
  private _restrict: Set<SliceId> | undefined = undefined;
  private _restrictionOwner: SliceId | undefined = undefined;

  checkRestriction(sliceId: SliceId) {
    if (!this._restrictionOwner) {
      return;
    }

    if (this.isAllowed(sliceId)) {
      return;
    }

    throw new Error(
      `StoreState.getSliceState: slice with id "${sliceId}" cannot be accessed as it is not part of the dependency graph of Slice ${this._restrictionOwner}`,
    );
  }

  private isAllowed(sliceId: SliceId) {
    return sliceId === this._restrictionOwner || this._restrict?.has(sliceId);
  }

  _clearRestriction(owner: SliceId) {
    if (this._restrictionOwner !== owner) {
      return;
    }

    this._restrictionOwner = undefined;
    this._restrict = new Set();
  }

  _restrictSliceAndDeps(
    owner: SliceId,
    reverseSliceDependencies: Record<SliceId, Set<SliceId>>,
  ) {
    // Donot further all restriction to a slice that is already inside a restriction
    if (this._restrict?.has(owner)) {
      return;
    }

    const deps = new Set(reverseSliceDependencies[owner]);

    this._restrictionOwner = owner;
    this._restrict = deps;
  }
}

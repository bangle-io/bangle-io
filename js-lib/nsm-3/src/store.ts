import type { BaseStore, Dispatch } from './base-store';
import type { Effect, EffectCallback, EffectOpts } from './effect';
import { effect, EffectManager } from './effect';
import type { EffectCreator } from './effect/effect';
import { calcReverseDependencies } from './helpers';
import type { Operation, OperationCallback, OperationOpts } from './operation';
import { operation } from './operation';
import type { Slice } from './slice';
import type { StoreStateOpts } from './store-state';
import { StoreState } from './store-state';
import {
  Transaction,
  TX_META_DISPATCH_SOURCE,
  TX_META_STORE_NAME,
} from './transaction';
import type { SliceId } from './types';

type StoreOpts<TSliceName extends string = any> = {
  slices: Array<Slice<TSliceName, any, any>>;
  stateOverride?: NonNullable<StoreStateOpts<TSliceName>['stateOverride']>;
  dispatchTransaction?: DispatchTransaction;
  dispatchOperation?: DispatchOperation;
  storeName: string;
};

type DispatchOperation = (store: Store, operation: Operation) => void;

type DispatchTransaction = (
  store: Store,
  updateState: (state: StoreState<any>) => void,
  tx: Transaction<any>,
) => void;

type InternalStoreConfig<TSliceName extends string = any> = {
  slicesLookup: Record<SliceId, Slice<TSliceName, any, any>>;
  reverseSliceDependencies: Record<SliceId, Set<SliceId>>;
};

export const DEFAULT_DISPATCH_TRANSACTION: DispatchTransaction = (
  store,
  updateState,
  tx,
) => {
  const newState = store.state.applyTransaction(tx);
  updateState(newState);
};

export const DEFAULT_DISPATCH_OPERATION: DispatchOperation = (
  store,
  operation,
) => {
  operation.run(store);
};

export function store<TSliceName extends string>(
  opts: StoreOpts<TSliceName>,
): Store<TSliceName> {
  return Store.create(opts);
}

export class Store<TSliceName extends string = any>
  implements BaseStore<TSliceName>
{
  static create<TSliceName extends string>(opts: StoreOpts<TSliceName>) {
    const slicesLookup = Object.fromEntries(
      opts.slices.map((slice) => [slice.sliceId, slice]),
    );

    const config: InternalStoreConfig<TSliceName> = {
      slicesLookup,
      reverseSliceDependencies: calcReverseDependencies(opts.slices),
    };

    return new Store(opts, config);
  }

  private updateState = (state: StoreState<any>) => {
    const oldState = this._state;
    this._state = state;
    this._effectsManager.run(this._state._getChangedSlices(oldState));
  };

  readonly dispatch: Dispatch = (txn, opts) => {
    if (this._destroyed) {
      return;
    }

    txn.metadata.setMetadata(TX_META_STORE_NAME, this.opts.storeName);

    if (opts?.debugInfo) {
      txn.metadata.setMetadata(TX_META_DISPATCH_SOURCE, opts.debugInfo);
    }

    if (txn instanceof Transaction) {
      this._dispatchTxn(this, this.updateState, txn);
    } else {
      const operation = txn;
      this._dispatchOperation(this, operation);
    }
  };

  private _destroyed = false;
  private _dispatchOperation: DispatchOperation;
  private _dispatchTxn: DispatchTransaction;
  private _effectsManager: EffectManager;
  private _state: StoreState<TSliceName>;
  private constructor(
    public readonly opts: StoreOpts<TSliceName>,
    protected readonly config: InternalStoreConfig<TSliceName>,
  ) {
    this._state = StoreState.create(opts);

    this._dispatchTxn =
      opts.dispatchTransaction || DEFAULT_DISPATCH_TRANSACTION;

    this._dispatchOperation =
      opts.dispatchOperation || DEFAULT_DISPATCH_OPERATION;

    this._effectsManager = new EffectManager(this.opts.slices);
  }

  get destroyed() {
    return this._destroyed;
  }

  get name() {
    return this.opts.storeName;
  }

  get state(): StoreState<TSliceName> {
    return this._state;
  }

  destroy() {
    this._destroyed = true;

    this._effectsManager.destroy();
  }

  effect(
    callback: EffectCallback<Store<TSliceName>>,
    opts: EffectOpts = {},
  ): Effect {
    const ef = effect(callback, opts)(this);
    this._effectsManager.registerEffect(ef);

    return ef;
  }

  operation<TParams extends any[]>(
    cb: OperationCallback<TSliceName, TParams>,
    opts?: OperationOpts,
  ) {
    const op = operation<TSliceName>(opts)(cb);

    return op;
  }

  registerEffect(ef: EffectCreator) {
    this._effectsManager.registerEffect(ef(this));
  }
}

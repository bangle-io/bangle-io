import { CORE_ACTION_ON_READY } from './constants';
import type { Scheduler } from './effect';
import { SideEffectsManager } from './effect';
import type { DebugFunc } from './logging';
import { txLog } from './logging';
import type { Slice } from './slice';
import type { StoreStateConfig } from './state';
import { StoreState } from './state';
import type { Transaction } from './transaction';
import {
  TX_META_DISPATCH_SOURCE,
  TX_META_STORE_NAME,
  TX_META_STORE_TX_ID,
} from './transaction';
import type { AnySliceBase } from './types';

type DispatchTx<TX extends Transaction<any, any>, SB extends AnySliceBase> = (
  store: Store<SB>,
  tx: TX,
) => void;

let counter = 0;
function incrementalId() {
  return '' + counter++;
}

export class Store<SB extends AnySliceBase> {
  static create<SB extends AnySliceBase>({
    disableSideEffects = false,
    dispatchTx = (store, tx) => {
      let newState = store.state.applyTransaction(tx);

      if (newState === store.state) {
        console.debug('No state change, skipping update', tx.sliceKey);

        return;
      }

      store.updateState(newState, tx);
    },
    onError = (error) => {},
    scheduler,
    state,
    storeName,
    debug,
  }: {
    disableSideEffects?: boolean;
    dispatchTx?: DispatchTx<Transaction<any, any>, SB>;
    onError?: (error: Error) => void;
    scheduler?: Scheduler;
    state: StoreState<SB> | StoreStateConfig<SB>;
    storeName: string;
    debug?: DebugFunc;
  }) {
    if (!(state instanceof StoreState)) {
      state = StoreState.create(state);
    }

    const store = new Store(
      state,
      storeName,
      dispatchTx,
      scheduler,
      onError,
      disableSideEffects,
      debug,
    );

    // Trigger some core actions
    for (const slice of state._slices) {
      let val = (slice as unknown as Slice).actions?.[CORE_ACTION_ON_READY]?.();

      if (val) {
        store.dispatch(val);
      }
    }

    return store;
  }

  dispatch = (
    tx: Transaction<SB['key']['key'], any>,
    debugDispatch?: string,
  ) => {
    if (this._destroyed) {
      return;
    }
    // TODO add a check to make sure tx is actually allowed
    // based on the slice dependencies
    tx.setMetadata(TX_META_STORE_TX_ID, incrementalId());
    tx.setMetadata(TX_META_STORE_NAME, this.storeName);

    if (debugDispatch) {
      tx.appendMetadata(TX_META_DISPATCH_SOURCE, debugDispatch);
    }

    this._dispatchTx(this, tx);
  };

  private _abortController = new AbortController();
  private _destroyed = false;

  private _effectsManager: SideEffectsManager | undefined;

  constructor(
    public state: StoreState<SB>,
    public storeName: string,
    private _dispatchTx: DispatchTx<any, SB>,
    scheduler?: Scheduler,
    onError?: (error: Error) => void,
    disableSideEffects?: boolean,
    private _debug?: DebugFunc,
  ) {
    if (!disableSideEffects) {
      this._effectsManager = new SideEffectsManager(
        state._slices,
        state,
        scheduler,
        this._debug,
      );
    }

    this._abortController.signal.addEventListener(
      'abort',
      () => {
        this.destroy();
      },
      {
        once: true,
      },
    );
  }

  get destroyed() {
    return this._destroyed;
  }

  destroy() {
    this._destroyed = true;
    this._abortController.abort();
  }

  /**
   * Create a new store that only has access to the given slices
   * @param slices
   * @returns
   */
  getReducedStore<SB extends Slice>(
    slices: SB[],
    debugDispatch?: string,
  ): ReducedStore<SB> {
    return new ReducedStore(this, slices, debugDispatch);
  }

  onDestroy(cb: () => void) {
    this._abortController.signal.addEventListener('abort', cb, {
      once: true,
    });
  }

  updateState(newState: StoreState<SB>, tx?: Transaction<any, any>) {
    if (this._destroyed) {
      return;
    }

    if (this._debug && tx) {
      this._debug(txLog(tx));
    }

    this.state = newState;

    if (tx) {
      this._effectsManager?.queueSideEffectExecution(this, {
        sliceKey: tx.sliceKey,
        actionId: tx.actionId,
      });
    }
  }
}

export class ReducedStore<SB extends Slice> {
  dispatch = (
    tx: Transaction<SB['key']['key'], any>,
    debugDispatch?: string,
  ) => {
    if (this._debugDispatchSrc) {
      tx.appendMetadata(TX_META_DISPATCH_SOURCE, this._debugDispatchSrc);
    }
    if (debugDispatch) {
      tx.appendMetadata(TX_META_DISPATCH_SOURCE, debugDispatch);
    }
    // TODO add a developer check to make sure tx slice is actually allowed
    this._store.dispatch(tx);
  };

  constructor(
    private _store: Store<any>,
    private _slices: SB[],
    public _debugDispatchSrc?: string,
  ) {}

  get destroyed() {
    return this._store.destroyed;
  }

  get state(): StoreState<SB> {
    return this._store.state;
  }

  destroy() {
    this._store.destroy();
  }
}

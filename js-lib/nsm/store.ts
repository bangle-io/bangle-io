import type {
  AnySliceBase,
  InferSlicesKey,
  StoreTransaction,
  Transaction,
} from './common';
import { SideEffectsManager } from './effect';
import type { StoreStateConfig } from './state';
import { StoreState } from './state';

interface Scheduler {
  schedule: (cb: () => void) => void;
  cancel: () => void;
}
type DispatchTx<
  ST extends StoreTransaction<any, any>,
  SB extends AnySliceBase[],
> = (store: Store<SB>, tx: ST) => void;

let counter = 0;
function incrementalId() {
  return counter++;
}

export class Store<SB extends AnySliceBase[]> {
  static create<SB extends AnySliceBase[]>({
    disableSideEffects = false,
    dispatchTx = (store, tx) => {
      let newState = store.state.applyTransaction(tx);

      if (newState === store.state) {
        console.debug('No state change, skipping update', tx.sliceKey);

        return;
      }

      store.updateState(newState);
    },
    onError = (error) => {},
    scheduler,
    state,
    storeName,
  }: {
    disableSideEffects?: boolean;
    dispatchTx?: DispatchTx<StoreTransaction<InferSlicesKey<SB>, any>, SB>;
    onError?: (error: Error) => void;
    scheduler?: Scheduler;
    state: StoreState<SB> | StoreStateConfig<SB>;
    storeName: string;
  }) {
    if (!(state instanceof StoreState)) {
      state = StoreState.create(state);
    }

    return new Store(
      state,
      storeName,
      dispatchTx,
      scheduler,
      onError,
      disableSideEffects,
    );
  }

  dispatch = (tx: Transaction<InferSlicesKey<SB>, any>) => {
    if (this._destroyed) {
      return;
    }
    // TODO add a check to make sure tx is actually allowed
    // based on the slice dependencies
    const storeTx: StoreTransaction<InferSlicesKey<SB>, any> = {
      ...tx,
      id: this.storeName + '-' + incrementalId(),
    };

    this._dispatchTx(this, storeTx);
  };

  private _destroyed = false;
  private _effectsManager: SideEffectsManager | undefined;
  private _runId = 0;

  constructor(
    public state: StoreState<SB>,
    public storeName: string,
    private _dispatchTx: DispatchTx<any, SB>,
    scheduler?: Scheduler,
    onError?: (error: Error) => void,
    disableSideEffects?: boolean,
  ) {
    if (!disableSideEffects) {
      this._effectsManager = new SideEffectsManager(state._slices, state);
    }
  }

  get destroyed() {
    return this._destroyed;
  }

  get runId() {
    return this._runId;
  }

  destroy() {
    this._destroyed = true;
  }

  updateState(newState: StoreState<SB>) {
    if (this._destroyed) {
      return;
    }

    this.state = newState;

    const tx = this.state.transaction;

    if (tx) {
      this._effectsManager?.runSideEffects(this, ++this._runId, tx.sliceKey);
    }
  }
}

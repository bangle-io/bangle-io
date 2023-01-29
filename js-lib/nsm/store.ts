import type {
  AnySliceBase,
  StoreBase,
  StoreTransaction,
  Transaction,
} from './common';
import type { InferSlicesKey, StoreStateConfig } from './state';
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

export class Store<SB extends AnySliceBase[]> implements StoreBase<SB> {
  static create<SB extends AnySliceBase[]>({
    disableSideEffects = false,
    dispatchTx = (store, tx) => {
      let newState = store.state.applyTransaction(tx);

      if (!newState) {
        throw new Error(
          `Store "${store.storeName}" returned undefined from applyTransaction`,
        );
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

    const storeTx: StoreTransaction<InferSlicesKey<SB>, any> = {
      ...tx,
      id: this.storeName + '-' + incrementalId(),
    };

    this._dispatchTx(this, storeTx);
  };

  private _destroyed = false;

  constructor(
    public state: StoreState<SB>,
    public storeName: string,
    private _dispatchTx: DispatchTx<any, SB>,
    scheduler?: Scheduler,
    onError?: (error: Error) => void,
    disableSideEffects?: boolean,
  ) {}

  get destroyed() {
    return this._destroyed;
  }

  destroy() {
    this._destroyed = true;
  }

  updateState(newState: StoreState<SB>) {
    this.state = newState;

    // TODO: add side effects
  }
}

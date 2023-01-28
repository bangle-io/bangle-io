import type { StoreTransaction, Transaction } from './common';
import { StoreState } from './state';

interface Scheduler {
  schedule: (cb: () => void) => void;
  cancel: () => void;
}
type DispatchTx = (store: Store, tx: StoreTransaction) => void;

let counter = 0;
function incrementalId() {
  return counter++;
}

export class Store {
  static create({
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
    dispatchTx?: DispatchTx;
    onError?: (error: Error) => void;
    scheduler?: Scheduler;
    state: StoreState | Parameters<typeof StoreState.create>[0];
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

  dispatch = (tx: Transaction) => {
    if (this._destroyed) {
      return;
    }

    let storeTx: StoreTransaction = {
      ...tx,
      id: this.storeName + '-' + incrementalId(),
    };

    this._dispatchTx(this, storeTx);
  };

  private _destroyed = false;

  constructor(
    public state: StoreState,
    public storeName: string,
    private _dispatchTx: DispatchTx,
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

  protected updateState(newState: StoreState) {
    this.state = newState;

    // TODO: add side effects
  }
}

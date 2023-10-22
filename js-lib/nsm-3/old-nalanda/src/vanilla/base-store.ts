import type { Operation } from './operation';
import type { Store } from './store';
import type { StoreState } from './store-state';
import type { Transaction } from './transaction';

export type InferSliceNameFromStore<T> = T extends BaseStore<infer TSliceName>
  ? TSliceName
  : never;

export type Dispatch<T> = (
  txn: Transaction<any> | Operation<any>,
  opts?: {
    debugInfo?: string;
  },
) => void;

export abstract class BaseStore<TSliceName extends string> {
  abstract readonly dispatch: Dispatch<any>;
  abstract readonly state: StoreState<TSliceName>;
}

export abstract class DerivativeStore<TSliceName extends string>
  implements BaseStore<TSliceName>
{
  private lastStateBeforeDestroy: StoreState<TSliceName> | undefined;
  dispatch: Dispatch<any> = (txn, opts) => {
    if (!this._rootStore) {
      console.error(
        `Cannot dispatch on a stale effect "${this.name}" run. This is likely a bug in your code.`,
      );
    } else {
      this._rootStore.dispatch(txn, {
        ...opts,
        debugInfo: this.name + (opts?.debugInfo ? ` (${opts.debugInfo})` : ''),
      });
    }
  };

  private _destroyed = false;

  /**
   * @internal
   */
  _rootStore: Store | undefined;
  constructor(_rootStore: Store, public readonly name: string) {
    this._rootStore = _rootStore;
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  get state(): StoreState<TSliceName> {
    if (!this._rootStore) {
      console.warn(
        `Trying to access store state of a destroyed store "${this.name}", this will give stale data and cause memory leaks.`,
      );

      return this.lastStateBeforeDestroy!;
    }

    return this._rootStore.state;
  }

  /**
   * @internal
   */
  _destroy(): void {
    if (this._destroyed) {
      return;
    }

    this.lastStateBeforeDestroy = this._rootStore?.state;
    this._rootStore = undefined;
    this._destroyed = true;
  }
}

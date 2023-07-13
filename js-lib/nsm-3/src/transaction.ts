import { idGeneration } from './helpers';
import type { ActionId, SliceId } from './types';

export type Step<TSliceName extends string, TParams extends any[]> = {
  params: TParams;
  actionId: ActionId;
  sourceSliceName: string;
  sourceSliceId: SliceId;
  targetSliceName: TSliceName;
  targetSliceId: SliceId;
};

export const META_DISPATCHER = 'DEBUG__DISPATCHER';
export const TX_META_STORE_NAME = 'store-name';

type TransactionOpts = {};

export class Transaction<TSliceName extends string> {
  static create<TSliceName extends string, TParams extends unknown[]>(opts: {
    name: TSliceName;
    params: TParams;
    actionId: ActionId;
    sourceSliceName: string;
    sourceSliceId: SliceId;
  }) {
    const step: Step<TSliceName, TParams> = {
      params: opts.params,
      actionId: opts.actionId,
      sourceSliceName: opts.sourceSliceName,
      sourceSliceId: opts.sourceSliceId,
      targetSliceName: opts.name,
      targetSliceId: opts.sourceSliceId,
    };

    return new Transaction<TSliceName>([step], {});
  }

  readonly metadata = new Metadata();

  readonly txId = idGeneration.createTransactionId();

  protected destroyed = false;

  private constructor(
    public readonly steps: ReadonlyArray<Step<any, unknown[]>>,
    protected readonly opts: TransactionOpts,
  ) {}

  get isDestroyed() {
    return this.destroyed;
  }

  append<TSliceName2 extends string>(
    txn: Transaction<TSliceName2>,
  ): Transaction<TSliceName | TSliceName2> {
    txn.destroyed = true;
    this.destroyed = true;

    return new Transaction<TSliceName | TSliceName2>(
      [...this.steps, ...txn.steps],
      this.opts,
    );
  }
}

export class Metadata {
  private _metadata: Record<string, string> = Object.create(null);

  appendMetadata(key: string, val: string) {
    let existing = this.getMetadata(key);
    this.setMetadata(key, existing ? existing + ',' + val : val);
  }

  fork(): Metadata {
    const meta = new Metadata();
    meta._metadata = { ...this._metadata };

    return meta;
  }

  getMetadata(key: string) {
    return this._metadata[key];
  }

  setMetadata(key: string, val: string) {
    this._metadata[key] = val;
  }
}

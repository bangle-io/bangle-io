import type { UpdaterType } from './helpers';
import { idGeneration, Updater } from './helpers';
import type { Slice } from './slice';
import type { StoreState } from './store-state';
import type { Step } from './transaction';
import { Transaction } from './transaction';
import type { ActionId, SliceId } from './types';

export type UserActionCallback<
  TParams extends any[],
  TActionBuilder extends ActionBuilder<any, any>,
> = (...params: TParams) => TActionBuilder;

export type ActionOpts<TSliceName extends string, TParams extends any[]> = {
  slice: Slice<TSliceName, any, any>;
  userCallback: UserActionCallback<TParams, ActionBuilder<any, any>>;
  debugName?: string | undefined;
};

// we save actions in a global registry, so we can call them again
// with the params in the txn.
export const actionRegistry = new Map<ActionId, Action<any, any>>();

export class Action<TSliceName extends string, TParams extends any[]> {
  actionId: ActionId;
  constructor(public readonly opts: ActionOpts<TSliceName, TParams>) {
    const hint = opts.debugName || opts.userCallback.name;
    this.actionId = idGeneration.createActionId(opts.slice.sliceId, hint);

    if (actionRegistry.has(this.actionId)) {
      throw new Error(`ActionId "${this.actionId}" can not already exist`);
    }
    actionRegistry.set(this.actionId, this);
  }

  /**
   * @internal
   */
  getTransactionBuilder(): (...params: TParams) => Transaction<TSliceName> {
    return (...params) => {
      const sliceStateBuilder = this.opts.userCallback(...params);

      return sliceStateBuilder.makeTxn({
        params,
        actionId: this.actionId,
        sliceId: this.opts.slice.sliceId,
        sliceName: this.opts.slice.name,
      });
    };
  }

  /**
   * Executes action based on params
   *
   * @internal
   */
  static _applyStep(
    storeState: StoreState<any>,
    step: Step<any, any>,
  ): Record<string, unknown> {
    const { actionId, targetSliceId, params } = step;

    const action = actionRegistry.get(actionId);

    if (!action) {
      throw new Error(
        `ActionId "${actionId}" for Slice "${targetSliceId}" does not exist`,
      );
    }

    const actionBuilder = action.opts.userCallback(...params);
    const result = actionBuilder.opts.calcUserSliceState(storeState);

    if (result != null && typeof result === 'object' && Updater in result) {
      return (result as UpdaterType<any>)[Updater] as any;
    }

    return result as any;
  }
}

// This is built new every time user calls mySliceAction({x:2})
//  and will also be built when a step is applied.
export class ActionBuilder<TSliceName extends string, TDep extends string> {
  constructor(
    public readonly opts: {
      name: TSliceName;
      calcUserSliceState: (
        storeState: StoreState<TSliceName | TDep>,
      ) => unknown;
    },
  ) {}

  makeTxn<TParams extends any[]>(obj: {
    actionId: ActionId;
    params: TParams;
    sliceId: SliceId;
    sliceName: TSliceName;
  }): Transaction<TSliceName> {
    return Transaction.create({
      name: this.opts.name,
      params: obj.params,
      actionId: obj.actionId,
      sourceSliceId: obj.sliceId,
      sourceSliceName: obj.sliceName,
    });
  }
}

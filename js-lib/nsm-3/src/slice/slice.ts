import type { UserActionCallback } from '../action';
import { Action, ActionBuilder } from '../action';
import type { StoreState } from '../store-state';
import type { Transaction } from '../transaction';
import type { AnySlice, InferSliceNameFromSlice } from '../types';
import type {
  CreateSliceOpts,
  UpdaterType,
  UserSliceOpts,
  ValidEffectStore,
} from './base-slice';
import { BaseSlice } from './base-slice';

export class Slice<
  TSliceName extends string,
  TState extends object,
  TDep extends string,
> extends BaseSlice<TSliceName, TState, TDep> {
  /**
   * @internal
   */
  static create<
    TSliceName extends string,
    TState extends object,
    TDepSlice extends Slice<string, any, any>,
  >(
    opts: CreateSliceOpts<
      TSliceName,
      TState,
      InferSliceNameFromSlice<TDepSlice>
    >,
  ): Slice<TSliceName, TState, InferSliceNameFromSlice<TDepSlice>> {
    return new Slice(opts);
  }

  private constructor(
    public readonly opts: CreateSliceOpts<TSliceName, TState, TDep>,
  ) {
    super(opts);
  }

  action<TParams extends any[]>(
    cb: UserActionCallback<TParams, ActionBuilder<any, any>>,
  ): (...params: TParams) => Transaction<TSliceName> {
    const action = new Action<TSliceName, TParams>({
      slice: this,
      userCallback: cb,
    });

    return action.getTransactionBuilder();
  }

  //   TODO implement
  query<TParams extends any[], TQuery>(
    cb: (
      ...params: TParams
    ) => (storeState: StoreState<TSliceName | TDep>) => TQuery,
  ): (storeState: StoreState<TSliceName | TDep>, ...params: TParams) => TQuery {
    return cb as any;
  }

  track<TStoreSlices extends string>(
    store: ValidEffectStore<TStoreSlices, TSliceName>,
  ): {
    [TKey in keyof TState]-?: () => TState[TKey];
  } {
    const result = Object.fromEntries(
      Object.keys(this.get(store.state as StoreState<any>)).map((key) => [
        key,
        () => {
          return (this.get(store.state as StoreState<any>) as any)[key];
        },
      ]),
    );

    return new Proxy(result, {
      get: (target, prop: string) => {
        store._addTrackedField(this, prop, target[prop]!());

        return target[prop];
      },
    }) as any;
  }

  tx(
    calcSliceState: (
      storeState: StoreState<TSliceName | TDep>,
    ) => TState | UpdaterType<TSliceName>,
  ): ActionBuilder<TSliceName, any> {
    return new ActionBuilder({
      name: this.name,
      calcUserSliceState: calcSliceState,
    });
  }
}

export function slice<
  TSliceName extends string,
  TState extends object,
  TDepSlice extends Slice<string, any, any>,
>(
  dependencies: TDepSlice[],
  opts: Omit<
    UserSliceOpts<TSliceName, TState, InferSliceNameFromSlice<TDepSlice>>,
    'dependencies'
  >,
): Slice<TSliceName, TState, InferSliceNameFromSlice<TDepSlice>> {
  return Slice.create<TSliceName, TState, AnySlice>({ ...opts, dependencies });
}

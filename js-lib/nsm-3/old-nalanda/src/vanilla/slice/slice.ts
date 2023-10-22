import type { UserActionCallback } from '../action';
import { Action, ActionBuilder } from '../action';
import type { UpdaterType } from '../helpers';
import type { StoreState } from '../store-state';
import type { Transaction } from '../transaction';
import type { AnySlice, InferSliceNameFromSlice } from '../types';
import type {
  CreateSliceOpts,
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

  simpleAction<TKey extends keyof TState>(
    key: TKey,
    updater?: (
      val: TState[TKey],
      state: StoreState<TSliceName | TDep>,
    ) => Partial<TState>,
  ) {
    return this.action(
      (val: TState[TKey]) => {
        return this.tx((state) => {
          return this.update(state, (existing) => {
            if (!updater) {
              if (val === existing[key]) {
                return existing;
              }

              return {
                ...existing,
                [key]: val,
              };
            }

            const newVal = updater(val, state);

            if (newVal === existing[key]) {
              return existing;
            }

            return newVal;
          });
        });
      },
      {
        name: `simpleAction(${key.toString()})`,
      },
    );
  }

  action<TParams extends any[]>(
    cb: UserActionCallback<TParams, ActionBuilder<any, any>>,
    opts?: { name?: string },
  ): (...params: TParams) => Transaction<TSliceName> {
    const action = new Action<TSliceName, TParams>({
      slice: this,
      userCallback: cb,
      debugName: opts?.name,
    });

    return action.getTransactionBuilder();
  }

  track<TStoreSlices extends string>(
    store: ValidEffectStore<TStoreSlices, TSliceName>,
  ): TState {
    return new Proxy(this.get(store.state as StoreState<any>), {
      get: (target, prop: string) => {
        // @ts-expect-error not sure how to fix this
        const val = target[prop];

        store._addTrackedField(this, prop, val);

        return val;
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

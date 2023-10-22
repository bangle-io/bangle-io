import type { EffectStore } from '../effect';
import type { UpdaterType } from '../helpers';
import { idGeneration, Updater } from '../helpers';
import type { StoreState } from '../store-state';
import type { SliceId } from '../types';
import type { Slice } from './slice';

export type UserSliceOpts<
  TSliceName extends string,
  TState extends object,
  TDep extends string,
> = {
  name: TSliceName;
  state: TState;
  dependencies: Array<Slice<TDep, any, any>>;
};

export type CalcDerivedState = (
  storeState: StoreState<any>,
) => Record<string, unknown>;

export type CreateSliceOpts<
  TSliceName extends string,
  TState extends object,
  TDep extends string,
> = UserSliceOpts<TSliceName, TState, TDep> & {
  // provided internally
  sliceId?: SliceId;
  calcDerivedState?: CalcDerivedState;
};

export type ValidStoreState<
  TStoreSlices extends string,
  TSliceName extends string,
> = TSliceName extends TStoreSlices ? StoreState<TStoreSlices> : never;

export type ValidEffectStore<
  TStoreSlices extends string,
  TSliceName extends string,
> = TSliceName extends TStoreSlices ? EffectStore<TStoreSlices> : never;

export abstract class BaseSlice<
  TSliceName extends string,
  TState extends object,
  TDep extends string,
> {
  readonly name: TSliceName;
  readonly initialState: TState;
  readonly dependencies: Array<Slice<TDep, any, any>>;
  readonly sliceId: SliceId;

  constructor(opts: CreateSliceOpts<TSliceName, TState, TDep>) {
    this.name = opts.name;
    this.initialState = opts.state;
    this.dependencies = opts.dependencies;
    this.sliceId = opts.sliceId || idGeneration.createSliceId(opts.name);
  }

  get<TStoreSlices extends string>(
    storeState: ValidStoreState<TStoreSlices, TSliceName>,
  ): TState {
    return storeState.resolve(this.sliceId) as TState;
  }

  query<TParams extends any[], TQuery>(
    cb: (...params: TParams) => (storeState: StoreState<TSliceName>) => TQuery,
  ): // TODO - currently TDep is not included as part of storeState
  (storeState: StoreState<any>, ...params: TParams) => TQuery {
    return (storeState, ...params) => cb(...params)(storeState);
  }

  update<TStoreSlices extends string>(
    storeState: ValidStoreState<TStoreSlices, TSliceName>,
    updater: ((cur: TState) => Partial<TState>) | Partial<TState>,
    opts: { replace?: boolean } = {},
  ): UpdaterType<TSliceName> {
    const sliceState = storeState.getSliceStateManager(this.sliceId)
      .sliceState as TState;

    const newSliceState =
      typeof updater === 'function' ? updater(sliceState) : updater;

    let mergedState: Partial<TState>;

    if (opts.replace) {
      mergedState = newSliceState;
    }
    // maintain reference equality if possible
    else if (newSliceState === sliceState) {
      mergedState = newSliceState;
    } else {
      mergedState = { ...sliceState, ...newSliceState };
    }

    return {
      name: this.name,
      [Updater]: mergedState,
    };
  }
}

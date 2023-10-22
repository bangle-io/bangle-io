import { shallowEqual } from '../helpers';
import type { StoreState, StoreStateKey } from '../store-state';
import type {
  AnySlice,
  ExtractReturnTypes,
  InferDepNameFromSlice,
  InferSliceNameFromSlice,
  NoInfer,
} from '../types';
import type {
  CreateSliceOpts,
  UserSliceOpts,
  ValidStoreState,
} from './base-slice';
import { BaseSlice } from './base-slice';
import { Slice } from './slice';

type AnyDerivedState = Record<string, Selector<any, any>>;

type AnySliceKey = SliceKey<any, any, any>;

export type SelectorOpts<T> = {
  equal?: (a: T, b: T) => boolean;
};

type SliceKeyToSliceOpts<TDerived extends AnyDerivedState> = {
  derivedState: TDerived;
};

// TODO implement the type
type Selector<TSliceKey, TSelectData> = (
  storeState: StoreState<
    InferSliceNameFromSlice<TSliceKey> | InferDepNameFromSlice<TSliceKey>
  >,
) => TSelectData;

export class SliceKey<
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
  ): SliceKey<TSliceName, TState, InferSliceNameFromSlice<TDepSlice>> {
    return new SliceKey(opts);
  }

  private constructor(
    public readonly opts: CreateSliceOpts<TSliceName, TState, TDep>,
  ) {
    super(opts);
  }

  override get<TStoreSlices extends string>(
    storeState: ValidStoreState<TStoreSlices, TSliceName>,
  ): TState {
    return storeState.resolve(this.sliceId, {
      skipDerivedData: true,
    }) as TState;
  }

  selector<TSelectData>(
    cb: Selector<SliceKey<TSliceName, TState, TDep>, TSelectData>,
    opts: SelectorOpts<NoInfer<TSelectData>> = {},
  ): Selector<SliceKey<TSliceName, TState, TDep>, TSelectData> {
    const valCache = new WeakMap<StoreState<any>, TSelectData>();
    const prevValCache = new WeakMap<StoreStateKey, TSelectData>();
    const equal = opts.equal;

    if (typeof equal === 'function') {
      return (storeState) =>
        equalityGetValue(storeState, cb, valCache, prevValCache, equal);
    }

    return (storeState) => getValue(storeState, cb, valCache);
  }

  slice<TDerived extends AnyDerivedState>(
    opts: SliceKeyToSliceOpts<TDerived>,
  ): Slice<TSliceName, ExtractReturnTypes<TDerived> & TState, TDep> {
    const derivedEntries = Object.entries(opts.derivedState);
    const prevDerivedValueCache = new WeakMap<
      StoreStateKey,
      Record<string, unknown>
    >();

    const newSlice = Slice.create({
      ...this.opts,
      sliceId: this.sliceId,
      calcDerivedState: (storeState) => {
        return calcSliceDerivedState(
          storeState,
          derivedEntries,
          prevDerivedValueCache,
        );
      },
    });

    return newSlice as any;
  }
}

export function sliceKey<
  TSliceName extends string,
  TState extends object,
  TDepSlice extends Slice<string, any, any>,
>(
  dependencies: TDepSlice[],
  opts: Omit<
    UserSliceOpts<TSliceName, TState, InferSliceNameFromSlice<TDepSlice>>,
    'dependencies'
  >,
): SliceKey<TSliceName, TState, InferSliceNameFromSlice<TDepSlice>> {
  return SliceKey.create<TSliceName, TState, AnySlice>({
    ...opts,
    dependencies,
  });
}

export function getValue<TStoreState extends StoreState<any>, TSelectData>(
  storeState: TStoreState,
  selector: Selector<AnySliceKey, TSelectData>,
  valCache: WeakMap<StoreState<any>, TSelectData>,
): TSelectData {
  if (valCache.has(storeState)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return valCache.get(storeState)!;
  }

  const newDerivedValue = selector(storeState);
  valCache.set(storeState, newDerivedValue);

  return newDerivedValue;
}

export function equalityGetValue<
  TStoreState extends StoreState<any>,
  TSelectData,
>(
  storeState: TStoreState,
  selector: Selector<AnySliceKey, TSelectData>,
  valCache: WeakMap<StoreState<any>, TSelectData>,
  prevValCache: WeakMap<StoreStateKey, TSelectData>,
  equalFn: (a: TSelectData, b: TSelectData) => boolean,
): TSelectData {
  if (valCache.has(storeState)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return valCache.get(storeState)!;
  }

  const newDerivedValue = selector(storeState);

  if (!prevValCache.has(storeState._storeStateKey)) {
    prevValCache.set(storeState._storeStateKey, newDerivedValue);
    valCache.set(storeState, newDerivedValue);

    return newDerivedValue;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const prevVal = prevValCache.get(storeState._storeStateKey)!;

  if (equalFn(newDerivedValue, prevVal)) {
    valCache.set(storeState, prevVal);

    return prevVal;
  }

  prevValCache.set(storeState._storeStateKey, newDerivedValue);
  valCache.set(storeState, newDerivedValue);

  return newDerivedValue;
}

/**
 * Goes through the new derived state and old derived state and returns the new derived state if it has changed.
 * Uses shallow object equality to determine if the derived state has changed.
 * TODO: we can optimize this, by skipping the calls of selector if the state or the dependencies have not changed.
 */
export function calcSliceDerivedState(
  storeState: StoreState<any>,
  derivedEntries: Array<[string, Selector<any, any>]>,
  prevDerivedValueCache: WeakMap<StoreStateKey, Record<string, unknown>>,
): Record<string, unknown> {
  const newDerivedState = Object.fromEntries(
    derivedEntries.map(([selectorKey, selector]) => {
      return [selectorKey, selector(storeState)];
    }),
  );

  const prevDerivedState = prevDerivedValueCache.get(storeState._storeStateKey);

  if (!prevDerivedState) {
    prevDerivedValueCache.set(storeState._storeStateKey, newDerivedState);

    return newDerivedState;
  }

  if (shallowEqual(prevDerivedState, newDerivedState)) {
    return prevDerivedState;
  }

  prevDerivedValueCache.set(storeState._storeStateKey, newDerivedState);

  return newDerivedState;
}

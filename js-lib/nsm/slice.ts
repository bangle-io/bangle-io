import type {
  AnyFn,
  EffectsBase,
  InferSlicesKey,
  SliceBase,
  SliceKeyBase,
  Transaction,
} from './common';
import { mapObjectValues } from './common';
import type { StoreState } from './state';

export class SliceKey<K extends string, SS extends object, DS extends Slice[]>
  implements SliceKeyBase<K, SS>
{
  constructor(public key: K, public initState: SS, public dependencies?: DS) {}
}

type ResolveStoreStateIfRegistered<
  SSB extends StoreState,
  K extends string,
> = SSB extends StoreState<infer SLs>
  ? K extends InferSlicesKey<SLs>
    ? SSB
    : never
  : never;

type DependenciesState<DS extends Slice[]> = {
  [K in keyof DS]: DS[K]['key']['initState'];
};

type DependenciesResolvedState<DS extends Slice[]> = {
  [K in keyof DS]: ReturnType<DS[K]['resolveState']>;
};

type RecordToValues<T extends Record<string, any>> = T extends Record<
  string,
  infer P
>
  ? P
  : never;

type SelectorFn<SS, DS extends Slice[], T> = (
  sliceState: SS,
  storeState: StoreState<DS>,
) => T;

type ResolvedSelectors<SE extends Record<string, SelectorFn<any, any, any>>> = {
  [K in keyof SE]: SE[K] extends AnyFn ? ReturnType<SE[K]> : never;
};

export type RawAction<P extends any[], SS, DS extends Slice[]> = (
  ...payload: P
) => (sliceState: SS, storeState: StoreState<DS>) => SS;

export type Action<K extends string, P extends any[] = unknown[]> = (
  ...payload: P
) => Transaction<K, P>;

export class Slice<
  K extends string = string,
  SS extends object = any,
  DS extends Slice[] = any,
  A extends Record<string, RawAction<any[], SS, DS>> = any,
  SE extends Record<string, SelectorFn<SS, DS, any>> = any,
> implements SliceBase<K, SS>
{
  static create<
    K extends string,
    SS extends object,
    DS extends Slice[],
    A extends Record<string, RawAction<any[], SS, DS>>,
    SE extends Record<string, SelectorFn<SS, DS, any>>,
  >({
    key,
    initState,
    dependencies,
    actions,
    effects = [],
    selectors,
  }: {
    key: K;
    initState: SS;
    selectors?: SE;
    dependencies?: DS;
    actions?: A;
    effects?: EffectsBase[];
  }) {
    return new Slice(
      new SliceKey(key, initState, dependencies),
      actions,
      selectors,
    );
  }

  fingerPrint: string;
  actions: RawActionsToActions<K, A>;

  constructor(
    public key: SliceKey<K, SS, DS>,
    private _rawActions: A = {} as A,
    public selectors: SE = {} as SE,
  ) {
    this.fingerPrint = `${key.key}(${(key.dependencies || [])
      .map((d) => d.fingerPrint)
      .join(',')})`;
    this.actions = parseRawActions(key.key, _rawActions);
  }

  // applyTransaction<SSB extends StoreState>(
  //   tx: Transaction<any, any>,
  //   storeState: StoreState,
  // ): SS {
  //   const action: undefined | RawAction<any, SS, DS> =
  //     this._rawActions[tx.actionId];

  //   if (!action) {
  //     throw new Error(
  //       `Action "${tx.actionId}" not found in Slice "${this.key.key}"`,
  //     );
  //   }

  //   const sliceState = this.getState(storeState);
  //   const depState = this.getDependenciesState(storeState);
  //   const newState = action(...tx.payload)(sliceState, depState);

  //   return newState;
  // }

  // getDependenciesState<SSB extends StoreState>(
  //   storeState: ResolveStoreStateIfRegistered<SSB, K>,
  // ): DependenciesState<DS> {
  //   // ensure the slice is registered in the store
  //   this.getState(storeState);

  //   const result = (this.key.dependencies || []).map((slice) => {
  //     return slice.getState(storeState);
  //   });

  //   return result as DependenciesState<DS>;
  // }

  getState<SSB extends StoreState>(
    storeState: ResolveStoreStateIfRegistered<SSB, K>,
  ): SS {
    const result = storeState.getSliceState(this as SliceBase<any, any>);

    return result;
  }

  resolveSelectors<SSB extends StoreState>(
    storeState: ResolveStoreStateIfRegistered<SSB, K>,
  ): ResolvedSelectors<SE> {
    const result = mapObjectValues(this.selectors, (selector) => {
      return selector(this.getState(storeState), storeState);
    });

    return result as any;
  }

  // Returns the slice state with the selectors resolved
  resolveState<SSB extends StoreState>(
    storeState: ResolveStoreStateIfRegistered<SSB, K>,
  ): SS & ResolvedSelectors<SE> {
    return {
      ...this.getState(storeState),
      ...this.resolveSelectors(storeState),
    };
  }

  _getRawAction(actionId: string): RawAction<any, any, any> | undefined {
    return this._rawActions[actionId];
  }
}

export type RawActionsToActions<
  K extends string,
  A extends Record<string, RawAction<any, any, any>>,
> = {
  [KK in keyof A]: A[KK] extends (...param: infer P) => any
    ? Action<K, P>
    : never;
};

export function parseRawActions<
  K extends string,
  A extends Record<string, RawAction<any, any, any>>,
>(key: K, actions: A): RawActionsToActions<K, A> {
  let result = mapObjectValues(
    actions,
    (action, actionName): Action<K, any> => {
      return (...payload) => {
        return {
          sliceKey: key,
          actionId: actionName,
          payload,
        };
      };
    },
  );

  return result as RawActionsToActions<K, A>;
}

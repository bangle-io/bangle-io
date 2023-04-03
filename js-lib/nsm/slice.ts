import { ActionSerializer } from './action-serializer';
import { mapObjectValues } from './common';
import type { StoreState } from './state';
import { Transaction } from './transaction';
import type {
  Action,
  AnyFn,
  EffectsBase,
  RawAction,
  SelectorFn,
  SliceBase,
  SliceKeyBase,
} from './types';

export class SliceKey<
  K extends string,
  SS extends object,
  SE extends Record<string, SelectorFn<SS, DS, any>>,
  DS extends Slice[],
> implements SliceKeyBase<K, SS>
{
  selectors: SE;

  constructor(
    public key: K,
    public dependencies: DS,
    public initState: SS,
    selectors: SE,
  ) {
    // NOTE: to allow accessing other selectors, but typing doesnt work
    this.selectors = mapObjectValues(selectors, (selector) =>
      selector.bind(selectors),
    ) as SE;
  }

  // /**
  //  * Helper function to get a typed action record
  //  * @param actions
  //  * @returns
  //  */
  // action<T extends any[]>(action: RawAction<T, SS, DS>): RawAction<T, SS, DS> {
  //   return action;
  // }
}

type ResolveStoreStateIfRegistered<
  SSB extends StoreState,
  K extends string,
> = SSB extends StoreState<infer SL>
  ? K extends SL['key']['key']
    ? SSB
    : never
  : never;

type ResolvedSelectors<SE extends Record<string, SelectorFn<any, any, any>>> = {
  [K in keyof SE]: SE[K] extends AnyFn ? ReturnType<SE[K]> : never;
};

export interface SliceConfig {}

export class Slice<
  K extends string = any,
  SS extends object = any,
  DS extends Slice[] = any,
  A extends Record<string, RawAction<any[], SS, DS>> = any,
  SE extends Record<string, SelectorFn<SS, DS, any>> = any,
> implements SliceBase<K, SS>
{
  fingerPrint: string;
  actions: RawActionsToActions<K, A>;

  _actionSerializer: ActionSerializer<K, SS, DS, A>;

  _flatDependencies: Set<string>;

  constructor(
    public key: SliceKey<K, SS, SE, DS>,
    public _rawActions: A,
    // Typescript acts weird if I use EffectsBase<Slice<x,y,z...>>
    public effects: Array<EffectsBase<Slice>>,
    public config: SliceConfig,
  ) {
    this.fingerPrint = `${key.key}(${(key.dependencies || [])
      .map((d) => d.fingerPrint)
      .join(',')})`;
    this.actions = parseRawActions(key.key, _rawActions);
    this._actionSerializer = new ActionSerializer(key, _rawActions);
    this._flatDependencies = this.key.dependencies.reduce((acc, dep) => {
      acc.add(dep.key.key);
      dep._flatDependencies.forEach((d) => {
        if (d === this.key.key) {
          throw new Error(
            `Circular dependency detected in slice "${this.key.key}" dependency "${dep.key.key}"`,
          );
        }
        acc.add(d);
      });

      return acc;
    }, new Set<string>());

    this.effects.forEach((effect) => {
      if (!effect.name) {
        effect.name = `${this.key.key}Effect`;
      }
    });
  }

  get selectors(): SE {
    return this.key.selectors;
  }

  getState<SSB extends StoreState>(
    storeState: ResolveStoreStateIfRegistered<SSB, K>,
  ): SS {
    const result = storeState.getSliceState(this as SliceBase<any, any>);

    return result;
  }

  pick<T>(
    cb: (resolvedState: SS & ResolvedSelectors<SE>) => T,
  ): [Slice<K, SS, DS, A, SE>, (storeState: StoreState) => T] {
    return [
      this,
      (storeState: StoreState) => {
        return cb(this.resolveState(storeState));
      },
    ];
  }

  resolveSelectors<SSB extends StoreState>(
    storeState: ResolveStoreStateIfRegistered<SSB, K>,
  ): ResolvedSelectors<SE> {
    const result = mapObjectValues(this.key.selectors, (selector) => {
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

  protected _fork(opts: {
    key?: SliceKey<K, SS, SE, DS>;
    effects?: EffectsBase[];
    config?: SliceConfig;
  }): Slice<K, SS, DS, A, SE> {
    return new Slice(
      opts.key || this.key,
      this._rawActions,
      opts.effects || this.effects,
      opts.config || this.config,
    );
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
        return new Transaction(key, payload, actionName);
      };
    },
  );

  return result as RawActionsToActions<K, A>;
}

/**
 * To be only used for testing scenarios. In production, slices should always have the same code
 */
export function testOverrideSlice<SL extends Slice>(
  slice: SL,
  {
    dependencies = slice.key.dependencies,
    initState = slice.key.initState,
    effects = slice.effects,
    config = slice.config,
  }: {
    // since this is for testing, we can allow any slice
    dependencies?: Slice[];
    initState?: SL['key']['initState'];
    effects?: EffectsBase[];
    config?: SliceConfig;
  },
) {
  const key = new SliceKey(
    slice.key.key,
    dependencies,
    initState,
    slice.selectors,
  );

  return new Slice(key, slice._rawActions, effects, config);
}

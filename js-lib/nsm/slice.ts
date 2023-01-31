import type {
  Action,
  ActionSerialData,
  AnyFn,
  EffectsBase,
  InferSlicesKey,
  RawAction,
  RawJsAction,
  SelectorFn,
  SliceBase,
  SliceKeyBase,
} from './common';
import { mapObjectValues, serialActionCache } from './common';
import type { StoreState } from './state';

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
    public initState: SS,
    selectors: SE,
    public dependencies: DS,
  ) {
    // to allow accessing other selectors
    this.selectors = mapObjectValues(selectors, (selector) =>
      selector.bind(selectors),
    ) as SE;
  }
}

type ResolveStoreStateIfRegistered<
  SSB extends StoreState,
  K extends string,
> = SSB extends StoreState<infer SLs>
  ? K extends InferSlicesKey<SLs>
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
  DS extends Slice[] = any[],
  A extends Record<string, RawAction<any[], SS, DS>> = any,
  SE extends Record<string, SelectorFn<SS, DS, any>> = any,
> implements SliceBase<K, SS>
{
  fingerPrint: string;
  actions: RawActionsToActions<K, A>;

  constructor(
    public key: SliceKey<K, SS, SE, DS>,
    public _rawActions: A = {} as A,
    // Typescript acts weird if I use EffectsBase<Slice<x,y,z...>>
    public effects: Array<EffectsBase<any>> = [],
    public config?: SliceConfig,
  ) {
    this.fingerPrint = `${key.key}(${(key.dependencies || [])
      .map((d) => d.fingerPrint)
      .join(',')})`;
    this.actions = parseRawActions(key.key, _rawActions);
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

  parseActionPayload<AK extends keyof A>(
    payload: string,
    actionId: AK extends string ? AK : never,
  ): Parameters<A[AK]> {
    const action = this._getRawSerializedAction(actionId);

    if (!action) {
      throw new Error(
        `Action ${actionId} not found or does not have a serializer`,
      );
    }

    return action.serialData.parse(payload);
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

  serializeActionPayload(payload: unknown, actionId: string): string {
    const action = this._getRawAction(actionId);

    if (!action) {
      throw new Error(`Action ${actionId} not found in slice ${this.key.key}`);
    }

    const serialData = serialActionCache.get(action);

    if (!serialData) {
      throw new Error(
        `Action ${actionId} in slice ${this.key.key} is not serializable`,
      );
    }

    return serialData.serialize(payload);
  }

  _getRawAction(actionId: string): RawJsAction<any, any, any> | undefined {
    const action = this._rawActions[actionId];

    if (!action) {
      return undefined;
    }

    return action;
  }

  _getRawSerializedAction(actionId: string):
    | {
        action: RawJsAction<any, any, any>;
        serialData: ActionSerialData<any>;
      }
    | undefined {
    const action = this._getRawAction(actionId);

    if (!action) {
      throw new Error(`Action ${actionId} not found in slice ${this.key.key}`);
    }

    const serialData = serialActionCache.get(action);

    if (!serialData) {
      throw new Error(
        `Action ${actionId} in slice ${this.key.key} is not serializable`,
      );
    }

    return {
      action,
      serialData,
    };
  }

  _isSyncReady(): boolean {
    // all actions must be serial
    return Object.values(this._rawActions).every((action) =>
      serialActionCache.has(action),
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

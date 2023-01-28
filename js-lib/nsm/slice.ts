import type { ActionSnapshot } from './common';
import { throwSliceActionNotFound, throwSliceStateNotFound } from './errors';
import type { State } from './state';
import type { ReplaceReturnType } from './utils';
import { createKey } from './utils';

type NotFunction<T> = T extends (...args: any[]) => any ? never : T;

interface StoreState<SK extends AnySliceKey> {}

type AnySlicesRecord = Record<string, Slice<any, any>>;
type AnySliceKey = SliceKey<any, AnySlicesRecord>;
type ActionSnapshotFn<P> = (p: P) => ActionSnapshot<P>;

type Action<P, SK extends AnySliceKey> = (
  param: P,
) => (
  state: InferSliceKeyState<SK>,
  dep: InferSlicesState<InferSliceKeyDep<SK>>,
) => InferSliceKeyState<SK>;

type Effect<SK extends AnySliceKey, A> = {
  update?: (
    opts: {
      actions: A;
      state: StoreState<SK>;
      prevState: StoreState<SK>;
    },
    dependencies: InferSliceKeyDep<SK>,
  ) => void;

  once?: (
    opts: {
      actions: A;
      state: StoreState<SK>;
    },
    dependencies: InferSliceKeyDep<SK>,
  ) => void | (() => void);

  // TODO: add sync
};

export class SliceKey<S extends object, DS extends AnySlicesRecord> {
  constructor(
    public key: string,
    public initState: S,
    public dependencies?: DS,
  ) {}
}

export class Slice<
  SK extends AnySliceKey,
  A extends { [s: string]: Action<any, SK> },
> {
  static create<
    S extends object,
    DS extends AnySlicesRecord,
    A extends { [s: string]: Action<any, SliceKey<S, DS>> },
  >({
    key,
    initState,
    dependencies,
    actions,
    effects,
  }: {
    key: string;
    initState: S;
    actions: A;
    dependencies?: DS;
    effects?: Array<Effect<SliceKey<S, DS>, A>>;
  }) {
    const sliceKey = new SliceKey(key, initState, dependencies);

    return new Slice({ key: sliceKey, actions, effects });
  }

  readonly initState: InferSliceKeyState<SK>;
  readonly actions: ActionsObjToActionsSnapshotObj<A>;
  readonly key: SK;
  readonly uid: string;
  readonly effects?: Array<Effect<SK, A>>;
  private _userActions: A;

  constructor(config: { key: SK; actions: A; effects?: Array<Effect<SK, A>> }) {
    const { actions, key, effects } = config;

    this.key = key;
    this.initState = key.initState;
    this.actions = actionToActionSnapshot(key, actions);
    this._userActions = actions;
    this.effects = effects;

    // we need to create a unique id for the syncing of different stores
    // we include dependencies in the uid so as to prevent any mismatches
    this.uid = [
      key.key,
      '(',
      ...Object.values(key.dependencies || {})
        .map((d) => `${d.uid}`)
        .sort((a, b) => a.localeCompare(b))
        .join(','),
      ')',
    ].join('');
  }

  applyAction(
    actionSnapshot: ActionSnapshot,
    storeState: State,
  ): InferSliceKeyState<SK> {
    const { actionName, payload } = actionSnapshot;
    const userAction = this._userActions[actionName];

    if (!userAction) {
      throwSliceActionNotFound(this, actionName);
    }

    const state = this.getState(storeState);
    const depState = this.resolveDepState(storeState);

    let newState = userAction(payload)(state, depState);

    return newState;
  }

  getState(store: State): InferSliceKeyState<SK> {
    let result = this.getStateMaybe(store);

    if (!result) {
      throwSliceStateNotFound(this, store);
    }

    return result;
  }

  getStateMaybe(store: State): InferSliceKeyState<SK> | undefined {
    let result = store.getSliceState(this);

    return result;
  }

  resolveDepState(store: State): InferSlicesState<InferSliceKeyDep<SK>> {
    const dependencies = this.key.dependencies;

    if (!dependencies) {
      return {} as any;
    }

    return mapObject(dependencies, (d) => d.getState(store)) as any;
  }
}

type InferSliceKeyState<SK> = SK extends SliceKey<infer T, any> ? T : never;
type InferSliceKeyDep<SK> = SK extends SliceKey<any, infer DS> ? DS : never;

type InferSliceKey<SL> = SL extends Slice<infer SK, any> ? SK : never;

type InferSliceState<SL> = InferSliceKeyState<InferSliceKey<SL>>;

type InferSlicesState<SS extends Record<string, Slice<any, any>>> = {
  [K in keyof SS]: InferSliceState<SS[K]>;
};

export type ActionsObjToActionsSnapshotObj<
  A extends { [s: string]: Action<any, any> },
> = {
  [K in keyof A]: ReplaceReturnType<
    A[K],
    ActionSnapshot<InferActionParam<A[K]>>
  >;
};

type InferActionParam<A> = A extends Action<infer P, any> ? P : never;

export function actionToActionSnapshot<
  SK extends AnySliceKey,
  A extends { [s: string]: Action<any, any> },
>(key: SK, actionObj: A): ActionsObjToActionsSnapshotObj<A> {
  return mapObject(actionObj, (action): ActionSnapshotFn<unknown> => {
    return (payload) => ({
      actionName: action.name,
      payload: payload,
      sliceKey: key.key,
    });
  }) as any;
}

function mapObject<T, U>(
  obj: Record<string, T>,
  cb: (value: T, key: string) => U,
): Record<string, U> {
  const result: Record<string, U> = {};

  for (const [key, val] of Object.entries(obj)) {
    result[key] = cb(val, key);
  }

  return result;
}

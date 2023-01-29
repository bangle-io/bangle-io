import type {
  AnySliceBase,
  SliceBase,
  StoreStateBase,
  Transaction,
} from './common';

interface StoreStateOptions {
  debug?: boolean;
}

type InferSliceKey<SL extends AnySliceBase> = SL extends SliceBase<infer K, any>
  ? K
  : never;

export type InferSlicesKey<SB extends AnySliceBase[]> = {
  [K in keyof SB]: InferSliceKey<SB[K]>;
}[number];

const overrideKey = Symbol('slice-init-override');

export function overrideInitState<SL extends AnySliceBase>(
  slice: SL,
  state: SL['key']['initState'],
): SL {
  let val = {
    ...slice,
    [overrideKey]: state,
  };

  // This is a hack to keep typescript happy
  return val as any;
}

export interface StoreStateConfig<SB extends AnySliceBase[]> {
  slices: SB;
  opts?: StoreStateOptions;
}

export class StoreState<SB extends AnySliceBase[] = any>
  implements StoreStateBase<SB>
{
  static checkDependencyOrder(slices: AnySliceBase[]) {
    let seenKeys = new Set<string>();
    for (const slice of slices) {
      const { key } = slice;

      if (key.dependencies) {
        const depKeys = Object.values(key.dependencies).map((d) => d.key.key);

        for (const depKey of depKeys) {
          if (!seenKeys.has(depKey)) {
            throw new Error(
              `Slice "${key.key}" has a dependency on Slice "${depKey}" which is either not registered or is registered after this slice.`,
            );
          }
        }
      }
      seenKeys.add(key.key);
    }
  }

  static checkUniqueKeys(slices: AnySliceBase[]) {
    const keys = slices.map((s) => s.key.key);
    const unique = new Set(keys);

    if (keys.length !== unique.size) {
      throw new Error('Duplicate slice keys');
    }
  }

  static create<SB extends AnySliceBase[]>({
    slices,
    opts,
  }: StoreStateConfig<SB>): StoreState<SB> {
    StoreState.checkUniqueKeys(slices);
    StoreState.checkDependencyOrder(slices);

    const instance = new StoreState(slices, opts);

    for (const slice of slices) {
      if (Object.prototype.hasOwnProperty.call(slice, overrideKey)) {
        instance.slicesCurrentState[slice.key.key] = (slice as any)[
          overrideKey
        ];
      } else {
        instance.slicesCurrentState[slice.key.key] = slice.key.initState;
      }
    }

    return instance;
  }

  protected slicesCurrentState: { [k: string]: any } = Object.create(null);

  constructor(private _slices: SB, public opts?: StoreStateOptions) {}

  applyTransaction<P extends any[]>(
    tx: Transaction<InferSlicesKey<SB>, P>,
  ): StoreState<SB> | undefined {
    const newState = { ...this.slicesCurrentState };

    let found = false;

    for (const slice of this._slices) {
      if (slice.key.key === tx.sliceKey) {
        found = true;
        newState[slice.key.key] = slice.applyTransaction(tx, this);
      }
    }

    if (!found) {
      return undefined;
    }

    // TODO: append-action

    return this._fork(newState);
  }

  getSliceState<SL extends AnySliceBase>(
    slice: SL,
  ): SL['key']['initState'] | undefined {
    return this.slicesCurrentState[slice.key.key];
  }

  private _fork(slicesState: StoreState['slicesCurrentState']): StoreState {
    const newInstance = new StoreState(this._slices, this.opts);

    newInstance.slicesCurrentState = slicesState;

    return newInstance;
  }
}

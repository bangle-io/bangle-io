import type { Transaction } from './transaction';
import type { AnySliceBase, ResolveSliceIfRegistered } from './types';

interface StoreStateOptions {
  debug?: boolean;
}

export interface StoreStateConfig<SB extends AnySliceBase> {
  slices: SB[];
  opts?: StoreStateOptions;
}
export class StoreState<SB extends AnySliceBase = any> {
  static checkDependencyOrder(slices: AnySliceBase[]) {
    let seenKeys = new Set<string>();
    for (const slice of slices) {
      const { key } = slice;

      if (key.dependencies !== undefined) {
        const depKeys = key.dependencies.map((d) => d.key.key);

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
      const dups = findDuplications(keys);
      throw new Error('Duplicate slice keys ' + dups.join(', '));
    }
  }

  static create<SB extends AnySliceBase>({
    slices,
    opts,
  }: StoreStateConfig<SB>): StoreState<SB> {
    StoreState.checkUniqueKeys(slices);
    StoreState.checkDependencyOrder(slices);

    const instance = new StoreState(slices, opts);

    for (const slice of slices) {
      instance.slicesCurrentState[slice.key.key] = slice.key.initState;
    }

    return instance;
  }

  protected slicesCurrentState: { [k: string]: any } = Object.create(null);

  constructor(public _slices: SB[], public opts?: StoreStateOptions) {}

  applyTransaction<P extends any[]>(
    tx: Transaction<SB['key']['key'], P>,
  ): StoreState<SB> {
    const newState = { ...this.slicesCurrentState };

    let found = false;

    for (const slice of this._slices) {
      if (slice.key.key === tx.sliceKey) {
        found = true;
        const rawAction = slice._actionSerializer.getRawAction(tx.actionId);

        if (!rawAction) {
          throw new Error(
            `Action "${tx.actionId}" not found in Slice "${slice.key.key}"`,
          );
        }

        const sliceState = this._getSliceState(slice);

        if (!sliceState.found) {
          throw new Error(
            `Slice "${slice.key.key}" or one of its dependencies not found in store`,
          );
        }

        newState[slice.key.key] = rawAction(...tx.payload)(
          sliceState.value,
          this,
        );
      }
    }

    if (!found) {
      return this;
    }

    // TODO: append-action
    return this._fork(newState);
  }

  getSliceState<SL extends AnySliceBase>(
    slice: ResolveSliceIfRegistered<SL, SB>,
  ): SL['key']['initState'] {
    let result = this.slicesCurrentState[slice.key.key]!;

    if (result === undefined) {
      throw new Error(`Slice "${slice.key.key}" not found in store`);
    }

    return result;
  }

  private _fork(slicesState: StoreState['slicesCurrentState']): StoreState {
    const newInstance = new StoreState(this._slices, this.opts);
    newInstance.slicesCurrentState = slicesState;

    return newInstance;
  }

  // An internal method to get the state of a slice without generic type hassles
  private _getSliceState<SL extends AnySliceBase>(
    slice: SL,
  ):
    | { found: true; value: SL['key']['initState'] }
    | { found: false; value: undefined } {
    if (Object.hasOwnProperty.call(this.slicesCurrentState, slice.key.key)) {
      return {
        found: true,
        value: this.slicesCurrentState[slice.key.key],
      };
    }

    return { found: false, value: undefined };
  }
}

function findDuplications<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const dupes = new Set<T>();

  for (const item of arr) {
    if (seen.has(item)) {
      dupes.add(item);
    } else {
      seen.add(item);
    }
  }

  return [...dupes];
}

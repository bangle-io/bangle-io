import { isPlainObject } from '@bangle.io/mini-js-utils';

import type { SliceBase, Transaction } from './common';

interface StoreStateOptions {
  debug?: boolean;
}

interface SliceStatePair {
  _isPair: string;
  val: { slice: SliceBase; initState: unknown };
}

function isSliceStatePair(obj: any): obj is SliceStatePair {
  return isPlainObject(obj) && obj._isPair === '$$sliceStatePair';
}

export function overrideInitState<SL extends SliceBase>(
  slice: SL,
  state: SL extends SliceBase<infer SS> ? SS : never,
): SliceStatePair {
  return {
    _isPair: '$$sliceStatePair' as const,
    val: { slice, initState: state },
  };
}

export class StoreState {
  static checkDependencyOrder(slices: SliceBase[]) {
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

  static checkUniqueKeys(slices: SliceBase[]) {
    const keys = slices.map((s) => s.key.key);
    const unique = new Set(keys);

    if (keys.length !== unique.size) {
      throw new Error('Duplicate slice keys');
    }
  }

  static create({
    slices: rawSlices,
    opts,
  }: {
    slices: Array<SliceBase | SliceStatePair>;
    opts?: StoreStateOptions;
  }): StoreState {
    const slices: SliceBase[] = rawSlices.map((s) => {
      if (isSliceStatePair(s)) {
        return s.val.slice;
      }

      return s;
    });

    StoreState.checkUniqueKeys(slices);
    StoreState.checkDependencyOrder(slices);

    const instance = new StoreState(slices, opts);

    for (const rawSlice of rawSlices) {
      if (isSliceStatePair(rawSlice)) {
        const { slice, initState } = rawSlice.val;
        instance.slicesCurrentState[slice.key.key] = initState;
      } else {
        const slice = rawSlice;
        instance.slicesCurrentState[slice.key.key] = slice.key.initState;
      }
    }

    return instance;
  }

  protected slicesCurrentState: { [k: string]: any } = Object.create(null);

  constructor(private _slices: SliceBase[], public opts?: StoreStateOptions) {}

  applyTransaction(tx: Transaction): StoreState | undefined {
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

  getSliceState<SL extends SliceBase>(
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

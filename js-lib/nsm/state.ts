import type { ActionSnapshot } from './common';
import { throwSliceStateNotFound } from './errors';

export interface SliceLike<SS = any> {
  key: {
    key: string;
    initState: SS;
    dependencies?: Record<string, SliceLike>;
  };

  applyAction: (action: ActionSnapshot, storeState: State) => SS;
}

interface Options {}

export class State {
  static checkDependencyOrder(slices: SliceLike[]) {
    let seenKeys = new Set<string>();
    for (const slice of slices) {
      const { key } = slice;

      if (key.dependencies) {
        const depKeys = Object.values(key.dependencies).map((d) => d.key.key);

        for (const depKey of depKeys) {
          if (seenKeys.has(depKey)) {
            throw new Error(
              `Slice ${key.key} has a dependency on ${depKey} which is not before it in the slice list`,
            );
          }
        }
      }
      seenKeys.add(key.key);
    }
  }

  static checkUniqueKeys(slices: SliceLike[]) {
    const keys = slices.map((s) => s.key.key);
    const unique = new Set(keys);

    if (keys.length !== unique.size) {
      throw new Error('Duplicate slice keys');
    }
  }

  static create({
    storeName,
    slices,
    opts,
  }: {
    storeName: string;
    slices: SliceLike[];
    opts?: Options;
  }): State {
    State.checkUniqueKeys(slices);
    State.checkDependencyOrder(slices);

    // const config = new AppStateConfig(slices, opts);
    const instance = new State(storeName, slices);
    slices.forEach((slice) => {
      instance.slicesCurrentState[slice.key.key] = slice.key.initState;
    });

    return instance;
  }

  protected slicesCurrentState: { [k: string]: any } = Object.create(null);

  constructor(public storeName: string, private _slices: SliceLike[]) {}

  applyAction(action: ActionSnapshot): State {
    const newState = { ...this.slicesCurrentState };

    let found = false;
    this._slices.forEach((slice) => {
      if (slice.key.key === action.sliceKey) {
        found = true;
        newState[slice.key.key] = slice.applyAction(action, this);
      }
    });

    if (!found) {
      throw new Error(`No slice found for slice "${action.sliceKey}"`);
    }

    // TODO: append-action
    const instance = new State(this.storeName, this._slices);
    instance.slicesCurrentState = newState;

    return instance;
  }

  getSliceState<SL extends SliceLike>(
    slice: SL,
  ): SL['key']['initState'] | undefined {
    return this.slicesCurrentState[slice.key.key];
  }

  getSliceStateAsserted<SL extends SliceLike>(
    slice: SL,
  ): SL['key']['initState'] {
    const state = this.slicesCurrentState[slice.key.key];

    if (state === undefined) {
      throwSliceStateNotFound(slice, this);
    }

    return state;
  }
}

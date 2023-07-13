import { calcReverseDependencies } from '../helpers';
import { DebugLogger } from '../logger';
import { AnySlice, SliceId } from '../types';
import { Effect } from './effect';

export class EffectManager {
  private effects: Effect[] = [];
  slicesLookup: Record<SliceId, AnySlice>;

  reverseDependencies: Record<SliceId, Set<AnySlice>> = {};

  constructor(
    private readonly slices: AnySlice[],
    private readonly debug?: DebugLogger,
  ) {
    this.slicesLookup = Object.fromEntries(
      slices.map((slice) => [slice.sliceId, slice]),
    );

    this.reverseDependencies = Object.fromEntries(
      Object.entries(calcReverseDependencies(slices)).map(
        ([sliceId, sliceIds]) => {
          return [
            sliceId,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            new Set([...sliceIds].map((id) => this.slicesLookup[id]!)),
          ];
        },
      ),
    );
  }

  registerEffect(effect: Effect): void {
    this.effects.push(effect);
    queueMicrotask(() => {
      effect.run();
    });
  }

  getAllSlicesChanged(slicesChanged?: AnySlice[]): undefined | Set<AnySlice> {
    if (slicesChanged === undefined) {
      return undefined;
    }

    const allSlicesChanges = new Set([...slicesChanged]);

    for (const slice of slicesChanged) {
      this.reverseDependencies[slice.sliceId]?.forEach((slice) => {
        allSlicesChanges.add(slice);
      });
    }

    return allSlicesChanges;
  }

  run(slicesChanged?: AnySlice[]) {
    const allSlices = this.getAllSlicesChanged(slicesChanged);
    for (const effect of this.effects) {
      effect.run(allSlices);
    }
  }

  destroy() {
    for (const effect of this.effects) {
      effect.destroy();
    }
  }
}

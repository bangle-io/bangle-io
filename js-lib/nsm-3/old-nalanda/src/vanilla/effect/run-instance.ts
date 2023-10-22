import { DerivativeStore } from '../base-store';
import type { CleanupCallback } from '../cleanup';
import type { Store } from '../store';
import type { AnySlice } from '../types';

type Dependencies = Map<AnySlice, Array<{ field: string; value: unknown }>>;
type ConvertToReadonlyMap<T> = T extends Map<infer K, infer V>
  ? ReadonlyMap<K, V>
  : T;

export class EffectStore<
  TSliceName extends string,
> extends DerivativeStore<TSliceName> {
  constructor(
    /**
     * @internal
     */
    public _runInstance: RunInstance | undefined,
    _rootStore: Store,
    name: string,
  ) {
    super(_rootStore, name);
  }

  /**
   * @internal
   */
  _addTrackedField(slice: AnySlice, field: string, val: unknown): void {
    this._runInstance?.addTrackedField(slice, field, val);
  }

  /**
   * @internal
   */
  override _destroy(): void {
    if (this.destroyed) {
      return;
    }

    this._runInstance = undefined;
    super._destroy();
  }
}

/**
 * @internal
 */
export class RunInstance {
  effectStore: EffectStore<any>;
  private _cleanups: Set<CleanupCallback> = new Set();
  private readonly _dependencies: Dependencies = new Map();

  /**
   * @internal
   * To keep track of how many times addTrackedField is called. If it's 0, then
   * the user most likely forgot to destructure/access the tracked field.
   *
   * For example
   * const foo = store.track() // this is incorrect and will not track anything
   *
   * const { foo } = store.track() // this is correct
   */
  _addTrackedCount = 0;

  constructor(public readonly rootStore: Store, public readonly name: string) {
    this.effectStore = new EffectStore(this, rootStore, this.name);
  }

  get dependencies(): ConvertToReadonlyMap<Dependencies> {
    return this._dependencies;
  }

  addCleanup(cleanup: CleanupCallback): void {
    this._cleanups.add(cleanup);
  }

  addTrackedField(slice: AnySlice, field: string, val: unknown): void {
    this._addTrackedCount++;

    const existing = this._dependencies.get(slice);

    if (existing === undefined) {
      this._dependencies.set(slice, [{ field, value: val }]);

      return;
    }

    existing.push({ field, value: val });

    return;
  }

  newRun(): RunInstance {
    if (!this.effectStore.destroyed) {
      this._cleanups.forEach((cleanup) => {
        void cleanup();
      });
    }

    this.effectStore._destroy();

    return new RunInstance(this.rootStore, this.name);
  }

  whatDependenciesStateChange(): false | string {
    for (const [slice, fields] of this._dependencies) {
      const currentSliceState = slice.get(this.rootStore.state) as Record<
        string,
        unknown
      >;

      for (const obj of fields) {
        if (!Object.is(obj.value, currentSliceState[obj.field])) {
          return obj.field;
        }
      }
    }

    return false;
  }
}

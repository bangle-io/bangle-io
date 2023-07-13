import { AnySlice } from '../types';
import { DerivativeStore } from '../base-store';
import { Store } from '../store';
import { CleanupCallback } from '../cleanup';

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
    _rootStore: Store<any>,
    name: string,
  ) {
    super(_rootStore, name);
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

  /**
   * @internal
   */
  _addTrackedField(slice: AnySlice, field: string, val: unknown): void {
    this._runInstance?.addTrackedField(slice, field, val);
  }
}

/**
 * @internal
 */
export class RunInstance {
  public effectStore: EffectStore<any>;
  private readonly _dependencies: Dependencies = new Map();

  get dependencies(): ConvertToReadonlyMap<Dependencies> {
    return this._dependencies;
  }

  private _cleanups: Set<CleanupCallback> = new Set();

  constructor(
    public readonly rootStore: Store<any>,
    public readonly name: string,
  ) {
    this.effectStore = new EffectStore(this, rootStore, this.name);
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

  addCleanup(cleanup: CleanupCallback): void {
    this._cleanups.add(cleanup);
  }

  addTrackedField(slice: AnySlice, field: string, val: unknown): void {
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
}

import type { AnySlice, SliceId } from '../types';

export function allDependencies(slices: AnySlice[]): Set<AnySlice> {
  const result = new Set<AnySlice>();

  for (const slice of slices) {
    for (const dep of slice.dependencies) {
      result.add(dep);
    }
    allDependencies(slice.dependencies).forEach((dep) => result.add(dep));
  }

  return result;
}

const calcReverseDependenciesCache = new WeakMap<
  AnySlice[],
  ReturnType<typeof calcReverseDependencies>
>();
/**
 * Returns Record of a flat list of all dependencies for the given slices.
 * @param slices
 * @returns
 */
export function calcReverseDependencies(
  slices: AnySlice[],
): Record<SliceId, Set<SliceId>> {
  if (calcReverseDependenciesCache.has(slices)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return calcReverseDependenciesCache.get(slices)!;
  }

  const reverseDependencies: Record<SliceId, Set<SliceId>> = {};

  for (const slice of slices) {
    for (const dep of slice.dependencies) {
      let result = reverseDependencies[dep.sliceId];

      if (!result) {
        result = new Set();
        reverseDependencies[dep.sliceId] = result;
      }

      result.add(slice.sliceId);
    }
  }
  const result = flattenReverseDependencies(reverseDependencies);
  calcReverseDependenciesCache.set(slices, result);

  return result;
}

export function flattenReverseDependencies(
  reverseDep: Record<SliceId, Set<SliceId>>,
) {
  const result: Record<SliceId, Set<SliceId>> = {};

  const recurse = (key: SliceId) => {
    let vals = result[key];

    if (vals) {
      return vals;
    }

    vals = new Set<SliceId>();
    result[key] = vals;

    const deps = reverseDep[key];

    if (deps) {
      for (const dep of deps) {
        vals.add(dep);
        for (const v of recurse(dep)) {
          vals.add(v);
        }
      }
    }

    return vals;
  };

  for (const key of Object.keys(reverseDep)) {
    recurse(key as SliceId);
  }

  return result;
}

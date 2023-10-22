import type { AnySlice } from '../types';

export function validateSlices(slices: AnySlice[]) {
  checkUniqDependency(slices);
  checkUniqueSliceId(slices);
  checkDependencyOrder(slices);
  circularCheck(slices);
}

function checkUniqDependency(slices: AnySlice[]) {
  for (const slice of slices) {
    const dependencies = slice.dependencies;

    if (
      new Set(dependencies.map((d) => d.sliceId)).size !== dependencies.length
    ) {
      throw new Error(
        `Slice "${slice.sliceId}" has duplicate dependencies: ${dependencies
          .map((d) => d.sliceId)
          .join(', ')}`,
      );
    }
  }
}

export function checkUniqueSliceId(slices: AnySlice[]) {
  const dups = checkUnique(slices.map((s) => s.sliceId));

  if (dups) {
    throw new Error('Duplicate slice ids ' + dups.join(', '));
  }
}

function checkUnique<T>(entities: T[]): T[] | undefined {
  const unique = new Set(entities);

  if (entities.length !== unique.size) {
    return findDuplications(entities);
  }

  return;
}

export function findDuplications<T>(arr: T[]): T[] {
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

export function circularCheck(slices: AnySlice[]) {
  const stack = new Set<string>();
  const visited = new Set<string>();

  const checkCycle = (slice: AnySlice): boolean => {
    const sliceId = slice.sliceId;

    if (stack.has(sliceId)) {
      return true;
    }

    if (visited.has(sliceId)) {
      return false;
    }

    visited.add(sliceId);
    stack.add(sliceId);

    for (const dep of slice.dependencies) {
      if (checkCycle(dep)) {
        return true;
      }
    }
    stack.delete(sliceId);

    return false;
  };

  for (const slice of slices) {
    const cycle = checkCycle(slice);

    if (cycle) {
      const path = [...stack];
      path.push(slice.sliceId);

      throw new Error(
        `Circular dependency detected in slice "${
          slice.sliceId
        }" with path ${path.join(' ->')}`,
      );
    }
  }
}

function checkDependencyOrder(slices: AnySlice[]) {
  let seenSliceIds = new Set<string>();
  for (const slice of slices) {
    const dependencies = slice.dependencies;

    if (dependencies !== undefined) {
      const depKeys = dependencies.map((d) => d.sliceId);
      for (const depKey of depKeys) {
        if (!seenSliceIds.has(depKey)) {
          throw new Error(
            `Slice "${slice.sliceId}" has a dependency on Slice "${depKey}" which is either not registered or is registered after this slice.`,
          );
        }
      }
    }
    seenSliceIds.add(slice.sliceId);
  }
}

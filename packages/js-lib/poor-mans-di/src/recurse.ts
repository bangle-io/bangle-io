/**
 * Helper type describing what we need to create instances.
 */
export type DependencyDefinition<T> = {
  name: string;
  create: (dependencies: Record<string, T>) => T;
  dependencies: string[];
};

/**
 * Recursive instantiation function:
 * - Takes an array of DependencyDefinition
 * - Instantiates each service only after all its dependencies are resolved
 * - Detects and prevents cycles
 */
export function recursiveInstantiate<T>(
  dependencyList: DependencyDefinition<T>[],
): Record<string, T> {
  const depMap = new Map<string, DependencyDefinition<T>>();
  for (const d of dependencyList) {
    depMap.set(d.name, d);
  }

  const instantiated = new Map<string, T>();
  const state = new Map<string, 'not_visited' | 'visiting' | 'visited'>();

  // Initialize all states to 'not_visited'
  for (const name of depMap.keys()) {
    state.set(name, 'not_visited');
  }

  function dfsResolve(name: string): T {
    if (instantiated.has(name)) {
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      return instantiated.get(name)!;
    }

    if (!depMap.has(name)) {
      throw new Error(`No dependency definition found for '${name}'`);
    }

    const currentState = state.get(name);
    if (currentState === 'visiting') {
      throw new Error(`Cycle detected while resolving '${name}'`);
    }
    if (currentState === 'visited') {
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      return instantiated.get(name)!;
    }

    // Mark as visiting
    state.set(name, 'visiting');

    const { dependencies, create } =
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      depMap.get(name)!;

    // Resolve dependencies first
    const depsInstances: Record<string, T> = {};
    for (const depName of dependencies) {
      depsInstances[depName] = dfsResolve(depName);
    }

    const instance = create(depsInstances ?? {});
    instantiated.set(name, instance);

    state.set(name, 'visited');
    return instance;
  }

  for (const name of depMap.keys()) {
    if (state.get(name) === 'not_visited') {
      dfsResolve(name);
    }
  }

  const result: Record<string, T> = {};
  for (const [key, val] of instantiated.entries()) {
    result[key] = val;
  }
  return result;
}

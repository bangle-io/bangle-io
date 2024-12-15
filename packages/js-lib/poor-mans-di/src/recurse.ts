/**
 * Helper type describing what we need to create instances.
 */
export type DependencyDefinition<T> = {
  name: string;
  create: (dependencies: Record<string, T>) => T;
  dependencies: string[];
};

/**
 * If a `focus` is provided, collect all the required dependencies to resolve those focuses.
 */
export function collectRequiredDependencies<T>(
  depMap: Map<string, DependencyDefinition<T>>,
  focus: string | string[],
): Set<string> {
  const focuses = Array.isArray(focus) ? focus : [focus];
  const required = new Set<string>();

  for (const f of focuses) {
    if (!depMap.has(f)) {
      throw new Error(`No dependency definition found for '${f}'`);
    }
    required.add(f);
  }

  const explore = (name: string) => {
    const def = depMap.get(name);
    if (!def) return;
    for (const dep of def.dependencies) {
      if (!required.has(dep)) {
        required.add(dep);
        explore(dep);
      }
    }
  };

  for (const f of focuses) {
    explore(f);
  }

  return required;
}

/**
 * Recursive instantiation function:
 * - Takes an array of DependencyDefinition
 * - Instantiates each service only after all its dependencies are resolved
 * - Detects and prevents cycles
 * @param dependencyList List of all dependency definitions
 * @param focus Optional service name(s) to focus on. If provided, only these services and their dependencies will be instantiated
 */
export function recursiveInstantiate<T>(
  dependencyList: DependencyDefinition<T>[],
  focus?: string | string[],
): Record<string, T> {
  // Convert the list to a map for easy lookup.
  const depMap = new Map<string, DependencyDefinition<T>>();
  for (const d of dependencyList) {
    depMap.set(d.name, d);
  }

  // If focus is provided, filter out services not required by the focused ones.
  if (focus) {
    const required = collectRequiredDependencies(depMap, focus);
    for (const key of depMap.keys()) {
      if (!required.has(key)) {
        depMap.delete(key);
      }
    }
  }

  const instantiated = new Map<string, T>();
  const state = new Map<string, 'not_visited' | 'visiting' | 'visited'>();

  // Initialize all states to 'not_visited'
  for (const name of depMap.keys()) {
    state.set(name, 'not_visited');
  }

  function dfsResolve(name: string): T {
    const currentState = state.get(name);

    if (!currentState) {
      throw new Error(`No dependency definition found for '${name}'`);
    }

    if (currentState === 'visiting') {
      throw new Error(`Cycle detected while resolving '${name}'`);
    }

    if (currentState === 'visited') {
      const instance = instantiated.get(name);
      if (!instance) {
        throw new Error(
          `No instance found for '${name}' despite being visited.`,
        );
      }
      return instance;
    }

    // currentState === 'not_visited'
    const def = depMap.get(name);
    if (!def) {
      throw new Error(`No dependency definition found for '${name}'`);
    }

    state.set(name, 'visiting');

    const { dependencies, create } = def;
    const depsInstances: Record<string, T> = {};
    for (const depName of dependencies) {
      depsInstances[depName] = dfsResolve(depName);
    }

    const instance = create(depsInstances);
    instantiated.set(name, instance);
    state.set(name, 'visited');

    return instance;
  }

  // Resolve all dependencies
  for (const name of depMap.keys()) {
    if (state.get(name) === 'not_visited') {
      dfsResolve(name);
    }
  }

  // Convert instantiated map to a plain object
  const result: Record<string, T> = {};
  for (const [key, val] of instantiated.entries()) {
    result[key] = val;
  }
  return result;
}

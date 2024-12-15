import { describe, expect, it } from 'vitest';
import {
  type DependencyDefinition,
  collectRequiredDependencies,
  recursiveInstantiate,
} from '../recurse';

type Service = string;

describe('recursiveInstantiate', () => {
  it('instantiates services without dependencies', () => {
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: () => 'Service A',
        dependencies: [],
      },
    ];

    const instances = recursiveInstantiate<Service>(services);
    expect(instances.A).toBe('Service A');
  });

  it('instantiates services with dependencies', () => {
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: (deps) => `Service A with ${deps.B}`,
        dependencies: ['B'],
      },
      {
        name: 'B',
        create: () => 'Service B',
        dependencies: [],
      },
    ];

    const instances = recursiveInstantiate<Service>(services);
    expect(instances.A).toBe('Service A with Service B');
    expect(instances.B).toBe('Service B');
  });

  it('detects and prevents circular dependencies', () => {
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: (deps) => `Service A with ${deps.B}`,
        dependencies: ['B'],
      },
      {
        name: 'B',
        create: (deps) => `Service B with ${deps.A}`,
        dependencies: ['A'],
      },
    ];

    expect(() => recursiveInstantiate<Service>(services)).toThrowError(
      `Cycle detected while resolving 'A'`,
    );
  });

  it('handles complex dependency graphs', () => {
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: (deps) => `Service A with ${deps.B} and ${deps.C}`,
        dependencies: ['B', 'C'],
      },
      {
        name: 'B',
        create: (deps) => `Service B with ${deps.D}`,
        dependencies: ['D'],
      },
      {
        name: 'C',
        create: () => 'Service C',
        dependencies: [],
      },
      {
        name: 'D',
        create: () => 'Service D',
        dependencies: [],
      },
    ];

    const instances = recursiveInstantiate<Service>(services);
    expect(instances.A).toBe(
      'Service A with Service B with Service D and Service C',
    );
    expect(instances.B).toBe('Service B with Service D');
    expect(instances.C).toBe('Service C');
    expect(instances.D).toBe('Service D');
  });

  it('throws an error for missing dependencies', () => {
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: (deps) => `Service A with ${deps.B}`,
        dependencies: ['B'],
      },
    ];

    expect(() => recursiveInstantiate<Service>(services)).toThrowError(
      `No dependency definition found for 'B'`,
    );
  });

  it('instantiates services in the correct order', () => {
    const instantiationOrder: string[] = [];
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: () => {
          instantiationOrder.push('A');
          return 'Service A';
        },
        dependencies: [],
      },
      {
        name: 'B',
        create: (deps) => {
          instantiationOrder.push('B');
          return `Service B with ${deps.A}`;
        },
        dependencies: ['A'],
      },
      {
        name: 'C',
        create: (deps) => {
          instantiationOrder.push('C');
          return `Service C with ${deps.B}`;
        },
        dependencies: ['B'],
      },
    ];

    const instances = recursiveInstantiate<Service>(services);
    expect(instances.C).toBe('Service C with Service B with Service A');
    expect(instantiationOrder).toEqual(['A', 'B', 'C']);
  });
});

describe('recursiveInstantiate with focus', () => {
  it('instantiates only focused service and its dependencies', () => {
    const instantiationOrder: string[] = [];
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: () => {
          instantiationOrder.push('A');
          return 'Service A';
        },
        dependencies: [],
      },
      {
        name: 'B',
        create: (deps) => {
          instantiationOrder.push('B');
          return `Service B with ${deps.A}`;
        },
        dependencies: ['A'],
      },
      {
        name: 'C',
        create: () => {
          instantiationOrder.push('C');
          return 'Service C';
        },
        dependencies: [],
      },
    ];

    const instances = recursiveInstantiate<string>(services, 'B');

    // Should only instantiate B and its dependency A
    expect(Object.keys(instances)).toEqual(['A', 'B']);
    expect(instances.B).toBe('Service B with Service A');
    expect(instantiationOrder).toEqual(['A', 'B']);
    expect(instances.C).toBeUndefined();
  });

  it('handles focus on service with no dependencies', () => {
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: () => 'Service A',
        dependencies: [],
      },
      {
        name: 'B',
        create: () => 'Service B',
        dependencies: [],
      },
    ];

    const instances = recursiveInstantiate<string>(services, 'A');

    expect(Object.keys(instances)).toEqual(['A']);
    expect(instances.A).toBe('Service A');
    expect(instances.B).toBeUndefined();
  });

  it('handles focus on service with deep dependency chain', () => {
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: () => 'Service A',
        dependencies: [],
      },
      {
        name: 'B',
        create: (deps) => `Service B with ${deps.A}`,
        dependencies: ['A'],
      },
      {
        name: 'C',
        create: (deps) => `Service C with ${deps.B}`,
        dependencies: ['B'],
      },
      {
        name: 'D',
        create: () => 'Service D',
        dependencies: [],
      },
    ];

    const instances = recursiveInstantiate<string>(services, 'C');

    expect(Object.keys(instances).sort()).toEqual(['A', 'B', 'C']);
    expect(instances.C).toBe('Service C with Service B with Service A');
    expect(instances.D).toBeUndefined();
  });

  it('throws an error if focus is invalid', () => {
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: () => 'Service A',
        dependencies: [],
      },
    ];

    expect(() =>
      recursiveInstantiate<string>(services, 'InvalidFocus'),
    ).toThrowError("No dependency definition found for 'InvalidFocus'");
  });
});

describe('recursiveInstantiate with focus array', () => {
  it('instantiates multiple focused services and their dependencies', () => {
    const instantiationOrder: string[] = [];
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: () => {
          instantiationOrder.push('A');
          return 'Service A';
        },
        dependencies: [],
      },
      {
        name: 'B',
        create: (deps) => {
          instantiationOrder.push('B');
          return `Service B with ${deps.A}`;
        },
        dependencies: ['A'],
      },
      {
        name: 'C',
        create: () => {
          instantiationOrder.push('C');
          return 'Service C';
        },
        dependencies: [],
      },
      {
        name: 'D',
        create: (deps) => {
          instantiationOrder.push('D');
          return `Service D with ${deps.C}`;
        },
        dependencies: ['C'],
      },
    ];

    const instances = recursiveInstantiate<string>(services, ['B', 'D']);

    // Should instantiate B, D and their dependencies (A and C)
    expect(Object.keys(instances).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(instances.B).toBe('Service B with Service A');
    expect(instances.D).toBe('Service D with Service C');
  });

  it('handles empty focus array as no focus', () => {
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: () => 'Service A',
        dependencies: [],
      },
      {
        name: 'B',
        create: () => 'Service B',
        dependencies: [],
      },
    ];

    const instances = recursiveInstantiate<string>(services, []);

    expect(Object.keys(instances).sort()).toEqual([]);
  });

  it('throws an error if any focus service is invalid', () => {
    const services: DependencyDefinition<string>[] = [
      {
        name: 'A',
        create: () => 'Service A',
        dependencies: [],
      },
    ];

    expect(() =>
      recursiveInstantiate<string>(services, ['A', 'InvalidFocus']),
    ).toThrowError("No dependency definition found for 'InvalidFocus'");
  });
});

describe('collectRequiredDependencies', () => {
  it('collects dependencies for a single service with no dependencies', () => {
    const depMap = new Map<string, DependencyDefinition<string>>([
      [
        'A',
        {
          name: 'A',
          create: () => 'Service A',
          dependencies: [],
        },
      ],
    ]);

    const required = collectRequiredDependencies(depMap, 'A');
    expect(required).toEqual(new Set(['A']));
  });

  it('collects dependencies for a service with multiple dependencies', () => {
    const depMap = new Map<string, DependencyDefinition<string>>([
      [
        'A',
        {
          name: 'A',
          create: (deps) => `Service A with ${deps.B} and ${deps.C}`,
          dependencies: ['B', 'C'],
        },
      ],
      [
        'B',
        {
          name: 'B',
          create: () => 'Service B',
          dependencies: [],
        },
      ],
      [
        'C',
        {
          name: 'C',
          create: (deps) => `Service C with ${deps.D}`,
          dependencies: ['D'],
        },
      ],
      [
        'D',
        {
          name: 'D',
          create: () => 'Service D',
          dependencies: [],
        },
      ],
    ]);

    const required = collectRequiredDependencies(depMap, 'A');
    expect(required).toEqual(new Set(['A', 'B', 'C', 'D']));
  });

  it('throws an error when focus service is not defined', () => {
    const depMap = new Map<string, DependencyDefinition<string>>([
      [
        'A',
        {
          name: 'A',
          create: () => 'Service A',
          dependencies: [],
        },
      ],
    ]);

    expect(() =>
      collectRequiredDependencies(depMap, 'NonExistent'),
    ).toThrowError("No dependency definition found for 'NonExistent'");
  });
});

describe('collectRequiredDependencies with array focus', () => {
  it('collects dependencies for multiple services', () => {
    const depMap = new Map<string, DependencyDefinition<string>>([
      [
        'A',
        {
          name: 'A',
          create: () => 'Service A',
          dependencies: [],
        },
      ],
      [
        'B',
        {
          name: 'B',
          create: (deps) => `Service B with ${deps.C}`,
          dependencies: ['C'],
        },
      ],
      [
        'C',
        {
          name: 'C',
          create: () => 'Service C',
          dependencies: [],
        },
      ],
    ]);

    const required = collectRequiredDependencies(depMap, ['A', 'B']);
    expect(required).toEqual(new Set(['A', 'B', 'C']));
  });
});

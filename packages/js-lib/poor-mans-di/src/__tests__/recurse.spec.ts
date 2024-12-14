import { describe, expect, it } from 'vitest';
import { type DependencyDefinition, recursiveInstantiate } from '../recurse';

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

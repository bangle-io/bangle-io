import type { BaseAppSyncDatabase } from '@bangle.io/types';
import { expect, it, vi } from 'vitest';

const invalidValues: Array<[string, () => unknown]> = [
  ['NaN', () => Number.NaN],
  ['Infinity', () => Number.POSITIVE_INFINITY],
  ['nested undefined', () => ({ nested: undefined })],
  ['a sparse array', () => Array(1)],
  ['a Map', () => new Map([['key', 'value']])],
  [
    'a circular value',
    () => {
      const value: unknown[] = [];
      value.push(value);
      return value;
    },
  ],
];

export function testSyncDatabaseJsonContract(
  setup: () => Promise<{ service: BaseAppSyncDatabase }>,
): void {
  it.each(
    invalidValues,
  )('JSON contract: rejects %s before changing storage or publishing', async (_label, createInvalidValue) => {
    const { service } = await setup();
    const options = { tableName: 'sync' } as const;
    const key = 'json-contract';
    const callback = vi.fn();
    const abortController = new AbortController();

    service.updateEntry(key, () => ({ value: 'existing' }), options);
    service.subscribe(options, callback, abortController.signal);

    expect(() =>
      Reflect.apply(service.updateEntry, service, [
        key,
        () => ({ value: createInvalidValue() }),
        options,
      ]),
    ).toThrow(/Cannot store unsupported/);
    expect(service.getEntry(key, options)).toEqual({
      found: true,
      value: 'existing',
    });
    expect(callback).not.toHaveBeenCalled();
    abortController.abort();
  });

  it('JSON contract: stores a detached canonical snapshot', async () => {
    const { service } = await setup();
    const options = { tableName: 'sync' } as const;
    const source = { nested: { value: -0 } };

    const result = service.updateEntry(
      'snapshot',
      () => ({ value: source }),
      options,
    );
    source.nested.value = 42;

    expect(result.value).toEqual({ nested: { value: 0 } });
    expect(service.getEntry('snapshot', options)).toEqual({
      found: true,
      value: { nested: { value: 0 } },
    });
  });

  it('JSON contract: isolates stored values from returned and callback mutations', async () => {
    const { service } = await setup();
    const options = { tableName: 'sync' } as const;
    const result = service.updateEntry(
      'isolation',
      () => ({ value: { nested: { value: 'stored' } } }),
      options,
    );

    if (typeof result.value === 'object' && result.value !== null) {
      Reflect.set(result.value, 'mutated', true);
    }
    service.updateEntry(
      'isolation',
      ({ value }) => {
        if (typeof value === 'object' && value !== null) {
          Reflect.set(value, 'mutated-in-callback', true);
        }
        return null;
      },
      options,
    );

    expect(service.getEntry('isolation', options)).toEqual({
      found: true,
      value: { nested: { value: 'stored' } },
    });
  });

  it('JSON contract: isolates stored values from subscriber mutations', async () => {
    const { service } = await setup();
    const options = { tableName: 'sync' } as const;
    const abortController = new AbortController();
    service.subscribe(
      options,
      (change) => {
        if (typeof change.value === 'object' && change.value !== null) {
          Reflect.set(change.value, 'mutated-by-subscriber', true);
        }
      },
      abortController.signal,
    );

    service.updateEntry(
      'subscriber-isolation',
      () => ({ value: { value: 'stored' } }),
      options,
    );

    expect(service.getEntry('subscriber-isolation', options)).toEqual({
      found: true,
      value: { value: 'stored' },
    });
    abortController.abort();
  });
}

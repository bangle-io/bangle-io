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
}

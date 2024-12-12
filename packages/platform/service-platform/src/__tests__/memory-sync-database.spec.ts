import { makeTestCommonOpts } from '@bangle.io/test-utils';
import type { SyncDatabaseQueryOptions } from '@bangle.io/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemorySyncDatabaseService } from '../memory-sync-database';

describe('MemorySyncDatabaseService', () => {
  let service: MemorySyncDatabaseService;
  const options: SyncDatabaseQueryOptions = { tableName: 'sync' };

  beforeEach(() => {
    const { commonOpts } = makeTestCommonOpts();
    service = new MemorySyncDatabaseService(commonOpts, undefined);
  });

  it('should store and retrieve entries', () => {
    const result = service.updateEntry(
      'key1',
      () => ({ value: 'value1' }),
      options,
    );

    expect(result).toEqual({ found: true, value: 'value1' });
    expect(service.getEntry('key1', options)).toEqual({
      found: true,
      value: 'value1',
    });
  });

  it('should handle deletion of entries', () => {
    service.updateEntry('key1', () => ({ value: 'value1' }), options);
    service.deleteEntry('key1', options);

    expect(service.getEntry('key1', options)).toEqual({
      found: false,
      value: undefined,
    });
  });

  it('should get all entries for a table', () => {
    service.updateEntry('key1', () => ({ value: 'value1' }), options);
    service.updateEntry('key2', () => ({ value: 'value2' }), options);

    const entries = service.getAllEntries(options);
    expect(entries).toHaveLength(2);
    expect(entries).toContain('value1');
    expect(entries).toContain('value2');
  });

  it('should handle updates to existing entries', () => {
    service.updateEntry('key1', () => ({ value: 'value1' }), options);
    service.updateEntry('key1', () => ({ value: 'updated' }), options);

    expect(service.getEntry('key1', options)).toEqual({
      found: true,
      value: 'updated',
    });
  });

  it.todo('should notify subscribers of changes', () => {
    const changes: any[] = [];
    const controller = new AbortController();

    service.subscribe(
      options,
      (change) => changes.push(change),
      controller.signal,
    );

    service.updateEntry('key1', () => ({ value: 'value1' }), options);
    service.updateEntry('key1', () => ({ value: 'value2' }), options);
    service.deleteEntry('key1', options);

    expect(changes).toHaveLength(3);
    expect(changes[0].type).toBe('create');
    expect(changes[1].type).toBe('update');
    expect(changes[2].type).toBe('delete');

    controller.abort();
  });
});

import { makeTestCommonOpts } from '@bangle.io/test-utils';
import type { SyncDatabaseQueryOptions } from '@bangle.io/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemorySyncDatabaseService } from '../memory-sync-database';

async function setup() {
  const { commonOpts, mockLog, controller } = makeTestCommonOpts();
  const context = {
    ctx: commonOpts,
    serviceContext: {
      abortSignal: commonOpts.rootAbortSignal,
    },
  };

  const service = new MemorySyncDatabaseService(context, null, null);
  await service.mount();

  return {
    service,
    mockLog,
    controller,
  };
}

describe('MemorySyncDatabaseService', () => {
  const options: SyncDatabaseQueryOptions = { tableName: 'sync' };

  it('should store and retrieve entries', async () => {
    const { service } = await setup();

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

  it('should handle deletion of entries', async () => {
    const { service } = await setup();

    service.updateEntry('key1', () => ({ value: 'value1' }), options);
    service.deleteEntry('key1', options);

    expect(service.getEntry('key1', options)).toEqual({
      found: false,
      value: undefined,
    });
  });

  it('should get all entries for a table', async () => {
    const { service } = await setup();

    service.updateEntry('key1', () => ({ value: 'value1' }), options);
    service.updateEntry('key2', () => ({ value: 'value2' }), options);

    const entries = service.getAllEntries(options);
    expect(entries).toHaveLength(2);
    expect(entries).toContain('value1');
    expect(entries).toContain('value2');
  });

  it('should handle updates to existing entries', async () => {
    const { service } = await setup();

    service.updateEntry('key1', () => ({ value: 'value1' }), options);
    service.updateEntry('key1', () => ({ value: 'updated' }), options);

    expect(service.getEntry('key1', options)).toEqual({
      found: true,
      value: 'updated',
    });
  });

  it('should notify subscribers of changes', async () => {
    const { service } = await setup();

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

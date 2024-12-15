/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdbDatabaseService } from '../idb-database';
import { createTestEnvironment } from '@bangle.io/test-utils';
import type { DatabaseQueryOptions } from '@bangle.io/types';

async function setup() {
  const { commonOpts } = createTestEnvironment();
  const context = {
    ctx: commonOpts,
    serviceContext: {
      abortSignal: commonOpts.rootAbortSignal,
    },
  };

  const service = new IdbDatabaseService(context, null, null);
  await service.mount();

  return { service, commonOpts };
}

describe('IdbDatabaseService', () => {
  const options: DatabaseQueryOptions = { tableName: 'workspace-info' };

  beforeEach(async () => {
    // IndexedDB resets automatically in happy-dom environment between tests.
  });

  it('should store and retrieve entries', async () => {
    const { service } = await setup();
    const key = 'key1';

    const result = await service.updateEntry(
      key,
      () => ({ value: 'value1' }),
      options,
    );
    expect(result).toEqual({ found: true, value: 'value1' });

    const entry = await service.getEntry(key, options);
    expect(entry).toEqual({ found: true, value: 'value1' });
  });

  it('should notify subscribers on create, update, delete', async () => {
    const { service } = await setup();
    const key = 'key2';
    const callback = vi.fn();
    const abortController = new AbortController();

    service.subscribe(options, callback, abortController.signal);

    // Create
    await service.updateEntry(key, () => ({ value: 'v1' }), options);
    expect(callback).toHaveBeenCalledWith({
      type: 'create',
      tableName: 'workspace-info',
      key,
      value: 'v1',
    });

    // Update
    await service.updateEntry(key, () => ({ value: 'v2' }), options);
    expect(callback).toHaveBeenCalledWith({
      type: 'update',
      tableName: 'workspace-info',
      key,
      value: 'v2',
    });

    // Delete
    await service.deleteEntry(key, options);
    expect(callback).toHaveBeenCalledWith({
      type: 'delete',
      tableName: 'workspace-info',
      key,
      value: undefined,
    });

    abortController.abort();
  });

  it('should handle no subscriber notification after unsubscribe', async () => {
    const { service } = await setup();
    const key = 'key3';
    const callback = vi.fn();
    const abortController = new AbortController();

    service.subscribe(options, callback, abortController.signal);
    abortController.abort();

    await service.updateEntry(key, () => ({ value: 'v3' }), options);
    expect(callback).not.toHaveBeenCalled();
  });
});

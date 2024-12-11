// @vitest-environment happy-dom

import { makeTestService } from '@bangle.io/test-utils';
import type { SyncDatabaseQueryOptions } from '@bangle.io/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserLocalStorageSyncDatabaseService } from '../browser-local-storage-sync-database';

describe('BrowserLocalStorageSyncDatabaseService', () => {
  const { commonOpts } = makeTestService();
  const service = new BrowserLocalStorageSyncDatabaseService(
    commonOpts,
    undefined,
  );
  const options: SyncDatabaseQueryOptions = { tableName: 'sync' };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should store and retrieve entries synchronously', () => {
    service.updateEntry('key1', () => ({ value: 'value1' }), options);
    const entry = service.getEntry('key1', options);
    expect(entry).toEqual({ found: true, value: 'value1' });
  });

  it('should notify subscribers on entry creation, update, and deletion', () => {
    const callback = vi.fn();
    const abortController = new AbortController();

    service.subscribe({ tableName: 'sync' }, callback, abortController.signal);

    // Create entry
    service.updateEntry('key1', () => ({ value: 'value1' }), options);

    expect(callback).toHaveBeenCalledWith({
      type: 'create',
      tableName: 'sync',
      key: 'key1',
      value: 'value1',
    });

    // Update entry
    service.updateEntry('key1', () => ({ value: 'value2' }), options);
    expect(callback).toHaveBeenCalledWith({
      type: 'update',
      tableName: 'sync',
      key: 'key1',
      value: 'value2',
    });

    // Delete entry
    service.deleteEntry('key1', options);
    expect(callback).toHaveBeenCalledWith({
      type: 'delete',
      tableName: 'sync',
      key: 'key1',
      value: undefined,
    });

    // Unsubscribe
    abortController.abort();
  });

  it('should not notify subscribers after unsubscribing', () => {
    const callback = vi.fn();
    const abortController = new AbortController();

    service.subscribe({ tableName: 'sync' }, callback, abortController.signal);

    // Unsubscribe
    abortController.abort();

    // Try to create an entry
    service.updateEntry('key2', () => ({ value: 'value2' }), options);
    expect(callback).not.toHaveBeenCalled();
  });
});

// @vitest-environment happy-dom

import { MemoryBroadcastChannel } from '@bangle.io/browser-utils';
import { createTestEnvironment } from '@bangle.io/test-utils';
import type { SyncDatabaseQueryOptions } from '@bangle.io/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserLocalStorageSyncDatabaseService } from '../browser-local-storage-sync-database';
import { testSyncDatabaseJsonContract } from './sync-database-json-contract';

async function setup() {
  const { commonOpts } = createTestEnvironment();
  const context = {
    ctx: commonOpts,
    serviceContext: {
      abortSignal: commonOpts.rootAbortSignal,
    },
  };

  const service = new BrowserLocalStorageSyncDatabaseService(context, null);
  await service.mount();

  return {
    service,
    commonOpts,
  };
}

describe('BrowserLocalStorageSyncDatabaseService', () => {
  const options: SyncDatabaseQueryOptions = { tableName: 'sync' };

  testSyncDatabaseJsonContract(setup);

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should store and retrieve entries synchronously', async () => {
    const { service } = await setup();

    service.updateEntry('key1', () => ({ value: 'value1' }), options);
    const entry = service.getEntry('key1', options);
    expect(entry).toEqual({ found: true, value: 'value1' });
  });

  it('should notify subscribers on entry creation, update, and deletion', async () => {
    const { service } = await setup();
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

  it('should not notify subscribers after unsubscribing', async () => {
    const { service } = await setup();
    const callback = vi.fn();
    const abortController = new AbortController();

    service.subscribe({ tableName: 'sync' }, callback, abortController.signal);

    // Unsubscribe
    abortController.abort();

    // Try to create an entry
    service.updateEntry('key2', () => ({ value: 'value2' }), options);
    expect(callback).not.toHaveBeenCalled();
  });

  it('rejects malformed changes from legacy broadcast senders', async () => {
    const { service } = await setup();
    const callback = vi.fn();
    const abortController = new AbortController();
    service.subscribe(options, callback, abortController.signal);

    const channel = new MemoryBroadcastChannel(service.name);
    channel.postMessage({
      senderId: 'legacy-tab',
      timestamp: Date.now(),
      data: {
        type: 'update',
        tableName: 'sync',
        key: 'legacy',
        value: Number.NaN,
      },
    });

    expect(callback).not.toHaveBeenCalled();
    abortController.abort();
    channel.close();
  });

  it('preserves malformed entries without updating or notifying subscribers', async () => {
    const { service } = await setup();
    const key = 'corrupt';
    const storageKey = `${service.name}.${options.tableName}:${key}`;
    const rawValue = '{ malformed json';
    const update = vi.fn(() => ({ value: 'replacement' }));
    const callback = vi.fn();
    const abortController = new AbortController();

    window.localStorage.setItem(storageKey, rawValue);
    const setItem = vi.spyOn(window.localStorage, 'setItem');
    service.subscribe(options, callback, abortController.signal);

    expect(() => service.updateEntry(key, update, options)).toThrow(
      'Cannot update malformed local storage database entry',
    );
    expect(update).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(storageKey)).toBe(rawValue);
    expect(callback).not.toHaveBeenCalled();
  });

  it.each([
    ['undefined', undefined],
    ['function', () => undefined],
    ['symbol', Symbol('unsupported')],
  ])('preserves raw storage when JSON.stringify cannot represent %s', async (_label, unsupportedValue) => {
    const { service } = await setup();
    const key = 'unsupported';
    const storageKey = `${service.name}.${options.tableName}:${key}`;
    const rawValue = '"existing value"';
    const callback = vi.fn();
    const abortController = new AbortController();

    window.localStorage.setItem(storageKey, rawValue);
    const setItem = vi.spyOn(window.localStorage, 'setItem');
    service.subscribe(options, callback, abortController.signal);

    expect(() =>
      Reflect.apply(service.updateEntry, service, [
        key,
        () => ({ value: unsupportedValue }),
        options,
      ]),
    ).toThrow('Cannot store unsupported local storage database value');
    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(storageKey)).toBe(rawValue);
    expect(callback).not.toHaveBeenCalled();
  });
});

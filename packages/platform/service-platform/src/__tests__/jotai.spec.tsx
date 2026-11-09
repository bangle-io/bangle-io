import { atomStorage } from '@bangle.io/base-utils';
import { T } from '@bangle.io/mini-js-utils';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import { RESET } from 'jotai/utils';
import { describe, expect, it, vi } from 'vitest';
import { MemorySyncDatabaseService } from '../memory-sync-database';

async function setup() {
  const result = makeTestCommonOpts();
  const { commonOpts, mockLog } = result;
  const store = commonOpts.store;
  const context = {
    ctx: commonOpts,
    serviceContext: {
      abortSignal: commonOpts.rootAbortSignal,
    },
  };
  const service = new MemorySyncDatabaseService(context, null);
  await service.mount();
  const syncDb = service;
  const logger = commonOpts.logger;
  const controller = new AbortController();

  return {
    syncDb,
    logger,
    service,
    store,
    mockLog,
    controller,
  };
}

describe('atomStorage', () => {
  it('should initialize with the initial value', async () => {
    const { syncDb, logger, store } = await setup();
    const atom = atomStorage({
      serviceName: 'test',
      key: 'testKey',
      initValue: 'initial',
      syncDb,
      validator: T.String,
      logger,
    });

    const value = store.get(atom);
    expect(value).toBe('initial');
  });

  it('should update the value correctly', async () => {
    const { syncDb, logger, store } = await setup();
    const atom = atomStorage({
      serviceName: 'test',
      key: 'testKey',
      initValue: 'initial',
      syncDb,
      validator: T.String,
      logger,
    });

    store.set(atom, 'updated');

    expect(store.get(atom)).toBe('updated');
    expect(syncDb.getEntry('test:testKey', { tableName: 'sync' })).toEqual({
      found: true,
      value: 'updated',
    });
  });

  it('should remove the value correctly', async () => {
    const { syncDb, logger, store } = await setup();
    const atom = atomStorage({
      serviceName: 'test',
      key: 'testKey',
      initValue: 'initial',
      syncDb,
      validator: T.String,
      logger,
    });

    store.set(atom, 'updated');
    store.set(atom, RESET);

    expect(store.get(atom)).toBe('initial');
    expect(syncDb.getEntry('test:testKey', { tableName: 'sync' })).toEqual({
      found: false,
      value: undefined,
    });
  });

  it('should handle different types correctly', async () => {
    const { syncDb, logger, store } = await setup();
    const numberAtom = atomStorage({
      serviceName: 'test',
      key: 'numberKey',
      initValue: 42,
      syncDb,
      validator: T.Number,
      logger,
    });

    expect(store.get(numberAtom)).toBe(42);

    store.set(numberAtom, 100);
    expect(store.get(numberAtom)).toBe(100);
    expect(syncDb.getEntry('test:numberKey', { tableName: 'sync' })).toEqual({
      found: true,
      value: 100,
    });

    const objectAtom = atomStorage({
      serviceName: 'test',
      key: 'objectKey',
      initValue: { name: 'test' },
      syncDb,
      validator: T.Object({ name: T.String }),
      logger,
    });

    expect(store.get(objectAtom)).toEqual({ name: 'test' });

    store.set(objectAtom, { name: 'updated' });
    expect(store.get(objectAtom)).toEqual({ name: 'updated' });
    expect(syncDb.getEntry('test:objectKey', { tableName: 'sync' })).toEqual({
      found: true,
      value: { name: 'updated' },
    });
  });

  it('should handle invalid values and log errors', async () => {
    const { syncDb, logger, store, mockLog } = await setup();
    const atom = atomStorage({
      serviceName: 'test',
      key: 'invalidKey',
      initValue: 'valid',
      syncDb,
      validator: T.String,
      logger,
    });

    store.set(
      atom,
      // @ts-expect-error -invalid type
      123,
    );
    expect(store.get(atom)).toBe('valid');
    expect(syncDb.getEntry('test:invalidKey', { tableName: 'sync' })).toEqual({
      found: false,
      value: undefined,
    });
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.any(String),
      'Invalid value for key',
      'test:invalidKey',
      123,
    );
  });

  it('rejects non-JSON numbers before changing live or persisted state', async () => {
    const { syncDb, logger, store, mockLog } = await setup();
    const atom = atomStorage({
      serviceName: 'test',
      key: 'finiteNumber',
      initValue: 42,
      syncDb,
      validator: T.Number,
      logger,
    });

    store.set(atom, Number.NaN);

    expect(store.get(atom)).toBe(42);
    expect(syncDb.getEntry('test:finiteNumber', { tableName: 'sync' })).toEqual(
      {
        found: false,
        value: undefined,
      },
    );
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.any(String),
      'Invalid value for key',
      'test:finiteNumber',
      Number.NaN,
    );
  });

  it('rejects non-JSON values received from a sync database', async () => {
    const { syncDb, logger, store, mockLog } = await setup();
    let publishLegacyValue: (() => void) | undefined;
    vi.spyOn(syncDb, 'subscribe').mockImplementation(
      (options, callback, signal) => {
        publishLegacyValue = () =>
          callback({
            type: 'update',
            tableName: options.tableName,
            key: 'test:legacyNumber',
            value: Number.NaN,
          });
        signal.addEventListener('abort', () => undefined, { once: true });
      },
    );
    const atom = atomStorage({
      serviceName: 'test',
      key: 'legacyNumber',
      initValue: 42,
      syncDb,
      validator: T.Number,
      logger,
    });
    const unsubscribe = store.sub(atom, () => undefined);

    publishLegacyValue?.();

    expect(store.get(atom)).toBe(42);
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.any(String),
      'Invalid value received for key',
      'test:legacyNumber',
      Number.NaN,
    );
    unsubscribe();
  });

  it('installs a detached canonical value in live and persisted state', async () => {
    const { syncDb, logger, store } = await setup();
    const atom = atomStorage({
      serviceName: 'test',
      key: 'canonicalObject',
      initValue: { name: 'initial', count: 1 },
      syncDb,
      validator: T.Object({ name: T.String, count: T.Number }),
      logger,
    });
    const source = { name: 'stored', count: -0 };

    store.set(atom, source);
    source.name = 'mutated';
    source.count = 42;

    expect(store.get(atom)).toEqual({ name: 'stored', count: 0 });
    expect(
      syncDb.getEntry('test:canonicalObject', { tableName: 'sync' }),
    ).toEqual({
      found: true,
      value: { name: 'stored', count: 0 },
    });
  });

  it('resets live state when a subscribed value is deleted', async () => {
    const { syncDb, logger, store } = await setup();
    const atom = atomStorage({
      serviceName: 'test',
      key: 'remoteDelete',
      initValue: false,
      syncDb,
      validator: T.Boolean,
      logger,
    });
    const unsubscribe = store.sub(atom, () => undefined);
    store.set(atom, true);
    expect(store.get(atom)).toBe(true);

    syncDb.deleteEntry('test:remoteDelete', { tableName: 'sync' });

    expect(store.get(atom)).toBe(false);
    unsubscribe();
  });
});

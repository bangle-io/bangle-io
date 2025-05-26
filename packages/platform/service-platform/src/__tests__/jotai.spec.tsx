import { atomStorage } from '@bangle.io/base-utils';
import { T } from '@bangle.io/mini-js-utils';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import { RESET } from 'jotai/utils';
import { describe, expect, it } from 'vitest';
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
  const service = new MemorySyncDatabaseService(context, null, null);
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
    expect(store.get(atom)).toBe(123);
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
});

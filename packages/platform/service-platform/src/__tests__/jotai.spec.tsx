import { atomStorage, atomWithCompare } from '@bangle.io/base-utils';
import type { Logger } from '@bangle.io/logger';
import { T, type Validator } from '@bangle.io/mini-zod';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import type { BaseAppSyncDatabase, Store } from '@bangle.io/types';
import { RESET } from 'jotai/utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemorySyncDatabaseService } from '../memory-sync-database';

describe('atomStorage', () => {
  let syncDb: BaseAppSyncDatabase;
  let logger: Logger;
  let service: MemorySyncDatabaseService;
  let store: Store;
  let mockLog: ReturnType<typeof makeTestCommonOpts>['mockLog'];

  beforeEach(async () => {
    const result = makeTestCommonOpts();
    mockLog = result.mockLog;
    const { commonOpts } = result;
    store = commonOpts.store;
    service = new MemorySyncDatabaseService(commonOpts, undefined);
    await service.initialize(); // Assuming there's an initialize method
    syncDb = service;
    logger = commonOpts.logger;
  });

  afterEach(async () => {
    await service.dispose(); // Assuming there's a dispose method
  });

  it('should initialize with the initial value', () => {
    const atom = atomStorage({
      key: 'testKey',
      initValue: 'initial',
      syncDb,
      validator: T.String,
      logger,
    });

    const value = store.get(atom);
    expect(value).toBe('initial');
  });

  it('should update the value correctly', () => {
    const atom = atomStorage({
      key: 'testKey',
      initValue: 'initial',
      syncDb,
      validator: T.String,
      logger,
    });

    store.set(atom, 'updated');

    expect(store.get(atom)).toBe('updated');
    expect(syncDb.getEntry('testKey', { tableName: 'sync' })).toEqual({
      found: true,
      value: 'updated',
    });
  });

  it('should remove the value correctly', () => {
    const atom = atomStorage({
      key: 'testKey',
      initValue: 'initial',
      syncDb,
      validator: T.String,
      logger,
    });

    store.set(atom, 'updated');
    store.set(atom, RESET);

    expect(store.get(atom)).toBe('initial');
    expect(syncDb.getEntry('testKey', { tableName: 'sync' })).toEqual({
      found: false,
      value: undefined,
    });
  });

  it('should handle different types correctly', () => {
    const numberAtom = atomStorage({
      key: 'numberKey',
      initValue: 42,
      syncDb,
      validator: T.Number,
      logger,
    });

    expect(store.get(numberAtom)).toBe(42);

    store.set(numberAtom, 100);
    expect(store.get(numberAtom)).toBe(100);
    expect(syncDb.getEntry('numberKey', { tableName: 'sync' })).toEqual({
      found: true,
      value: 100,
    });

    const objectAtom = atomStorage({
      key: 'objectKey',
      initValue: { name: 'test' },
      syncDb,
      validator: T.Object({ name: T.String }),
      logger,
    });

    expect(store.get(objectAtom)).toEqual({ name: 'test' });

    store.set(objectAtom, { name: 'updated' });
    expect(store.get(objectAtom)).toEqual({ name: 'updated' });
    expect(syncDb.getEntry('objectKey', { tableName: 'sync' })).toEqual({
      found: true,
      value: { name: 'updated' },
    });
  });

  it('should handle invalid values and log errors', () => {
    const atom = atomStorage({
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
    expect(syncDb.getEntry('invalidKey', { tableName: 'sync' })).toEqual({
      found: false,
      value: undefined,
    });
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.any(String),
      'Invalid value for key',
      'invalidKey',
      123,
    );
  });
});

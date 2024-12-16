/**
 * @vitest-environment happy-dom
 */

import { DATABASE_TABLE_NAME } from '@bangle.io/constants';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import type { DatabaseQueryOptions } from '@bangle.io/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryDatabaseService } from '../memory-database';

async function setup() {
  const { commonOpts, mockLog, controller } = makeTestCommonOpts();
  const context = {
    ctx: commonOpts,
    serviceContext: {
      abortSignal: commonOpts.rootAbortSignal,
    },
  };

  const service = new MemoryDatabaseService(context, null);
  await service.mount();

  return {
    service,
    mockLog,
    controller,
  };
}

describe('MemoryDatabaseService', () => {
  const workspaceOptions: DatabaseQueryOptions = {
    tableName: DATABASE_TABLE_NAME.workspaceInfo,
  };
  const miscOptions: DatabaseQueryOptions = {
    tableName: DATABASE_TABLE_NAME.misc,
  };

  it('should handle CRUD operations correctly', async () => {
    const { service } = await setup();
    const key = 'test-key';
    const value = { name: 'test-workspace' };

    // Create
    const createResult = await service.updateEntry(
      key,
      () => ({ value }),
      workspaceOptions,
    );
    expect(createResult).toEqual({ found: true, value });

    // Read
    const readResult = await service.getEntry(key, workspaceOptions);
    expect(readResult).toEqual({ found: true, value });

    // Update
    const updatedValue = { name: 'updated-workspace' };
    const updateResult = await service.updateEntry(
      key,
      () => ({ value: updatedValue }),
      workspaceOptions,
    );
    expect(updateResult).toEqual({ found: true, value: updatedValue });

    // Delete
    await service.deleteEntry(key, workspaceOptions);
    const afterDelete = await service.getEntry(key, workspaceOptions);
    expect(afterDelete).toEqual({ found: false, value: undefined });
  });

  it('should maintain separate storage for workspace and misc data', async () => {
    const { service } = await setup();
    const key = 'shared-key';

    // Store different values in different tables
    await service.updateEntry(
      key,
      () => ({ value: 'workspace-value' }),
      workspaceOptions,
    );
    await service.updateEntry(
      key,
      () => ({ value: 'misc-value' }),
      miscOptions,
    );

    // Verify separation
    const workspaceEntry = await service.getEntry(key, workspaceOptions);
    const miscEntry = await service.getEntry(key, miscOptions);

    expect(workspaceEntry.value).toBe('workspace-value');
    expect(miscEntry.value).toBe('misc-value');
  });

  it('should handle subscription lifecycle and notifications correctly', async () => {
    const { service } = await setup();
    const changes: any[] = [];
    const controller = new AbortController();

    // Subscribe to workspace changes
    service.subscribe(
      workspaceOptions,
      (change) => changes.push(change),
      controller.signal,
    );

    // Perform operations
    await service.updateEntry(
      'key1',
      () => ({ value: 'initial' }),
      workspaceOptions,
    );
    await service.updateEntry(
      'key1',
      () => ({ value: 'updated' }),
      workspaceOptions,
    );
    await service.deleteEntry('key1', workspaceOptions);

    // Verify notifications
    expect(changes).toHaveLength(3);
    expect(changes[0]).toEqual({
      type: 'create',
      tableName: DATABASE_TABLE_NAME.workspaceInfo,
      key: 'key1',
      value: 'initial',
    });
    expect(changes[1]).toEqual({
      type: 'update',
      tableName: DATABASE_TABLE_NAME.workspaceInfo,
      key: 'key1',
      value: 'updated',
    });
    expect(changes[2]).toEqual({
      type: 'delete',
      tableName: DATABASE_TABLE_NAME.workspaceInfo,
      key: 'key1',
      value: undefined,
    });

    // Cleanup subscription
    controller.abort();
  });

  it('should handle update callback returning null', async () => {
    const { service } = await setup();
    const key = 'test-key';

    const result = await service.updateEntry(key, () => null, workspaceOptions);

    expect(result).toEqual({ value: undefined, found: false });
    const entry = await service.getEntry(key, workspaceOptions);
    expect(entry).toEqual({ found: false, value: undefined });
  });
});

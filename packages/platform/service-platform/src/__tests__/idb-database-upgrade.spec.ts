/**
 * @vitest-environment happy-dom
 *
 * Lives in its own file so the database does not exist before the test:
 * simulating an old-version tab requires opening the database at a lower
 * version first, which is impossible once another spec created it at the
 * current version.
 */

import { DATABASE_TABLE_NAME } from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { DB_NAME, IdbDatabaseService } from '../idb-database';

const OLD_VERSION = 2;
const OLD_TABLES = [
  DATABASE_TABLE_NAME.workspaceInfo,
  DATABASE_TABLE_NAME.misc,
];

describe('IdbDatabaseService blocked upgrade', () => {
  it('boots at the existing version when an old tab blocks the upgrade, then adopts it', async () => {
    // Simulate a tab running an already-deployed old app version: it holds a
    // v2 connection and has no cooperative versionchange handling at all.
    const oldTabDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, OLD_VERSION);
      request.onupgradeneeded = () => {
        for (const table of OLD_TABLES) {
          if (!request.result.objectStoreNames.contains(table)) {
            request.result.createObjectStore(table, { keyPath: 'key' });
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    // Deliberately keep the connection open on versionchange.
    oldTabDb.onversionchange = () => {};

    const { commonOpts } = createTestEnvironment();
    const context = {
      ctx: commonOpts,
      serviceContext: {
        abortSignal: commonOpts.rootAbortSignal,
      },
    };
    const onStaleTab = vi.fn();
    const service = new IdbDatabaseService(context, null, { onStaleTab });

    // Mount must complete despite the old tab: no indefinite blank screen.
    await service.mount();

    // While the old tab blocks the upgrade, operations fail fast instead of
    // hanging the caller.
    const workspaceInfo = {
      tableName: DATABASE_TABLE_NAME.workspaceInfo,
    } as const;
    const snapshots = { tableName: DATABASE_TABLE_NAME.noteSnapshots } as const;
    await expect(
      service.updateEntry('snap', () => ({ value: 'x' }), snapshots),
    ).rejects.toThrow();

    // Once the old tab goes away, the pending upgrade completes and is
    // adopted: everything starts working mid-session.
    oldTabDb.close();
    await vi.waitFor(async () => {
      await service.updateEntry('snap', () => ({ value: 'x' }), snapshots);
    });
    expect(await service.getEntry('snap', snapshots)).toEqual({
      found: true,
      value: 'x',
    });
    await service.updateEntry('ws', () => ({ value: 'data' }), workspaceInfo);
    expect(await service.getEntry('ws', workspaceInfo)).toEqual({
      found: true,
      value: 'data',
    });

    // The yield-then-adopt flow is not a stale-tab situation.
    expect(onStaleTab).not.toHaveBeenCalled();
  });

  it('upgrades a fresh database without an extra roundtrip hanging boot', async () => {
    const { commonOpts } = createTestEnvironment();
    const context = {
      ctx: commonOpts,
      serviceContext: {
        abortSignal: commonOpts.rootAbortSignal,
      },
    };
    // The previous test upgraded the database already; this service takes
    // the single-open fast path.
    const service = new IdbDatabaseService(context, null);
    await service.mount();
    const snapshots = { tableName: DATABASE_TABLE_NAME.noteSnapshots } as const;
    await service.updateEntry('s', () => ({ value: 1 }), snapshots);
    expect(await service.getEntry('s', snapshots)).toEqual({
      found: true,
      value: 1,
    });
  });
});

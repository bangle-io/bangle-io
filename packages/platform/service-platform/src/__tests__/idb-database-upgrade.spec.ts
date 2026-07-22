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
import { describe, expect, it } from 'vitest';
import { DB_NAME, IdbDatabaseService } from '../idb-database';

const OLD_VERSION = 2;
const OLD_TABLES = [
  DATABASE_TABLE_NAME.workspaceInfo,
  DATABASE_TABLE_NAME.misc,
];

describe('IdbDatabaseService blocked upgrade', () => {
  it('fails every queued current tab instead of hanging, then recovers after the old tab closes', async () => {
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

    const createService = () => {
      const { commonOpts } = createTestEnvironment();
      const context = {
        ctx: commonOpts,
        serviceContext: {
          abortSignal: commonOpts.rootAbortSignal,
        },
      };
      return new IdbDatabaseService(context, null, { openTimeoutMs: 20 });
    };

    // The first request receives `blocked`; the second sits behind that
    // uncancellable request and is bounded by the timeout. Neither can hang.
    await expect(createService().mount()).rejects.toThrow(
      'Close or reload other Bangle tabs',
    );
    await expect(createService().mount()).rejects.toThrow(
      'Close or reload other Bangle tabs',
    );

    // IndexedDB completes the queued requests after the blocker closes. The
    // failed services close their late connections, so a reload can recover.
    oldTabDb.close();
    const recovered = createService();
    await recovered.mount();
    const snapshots = { tableName: DATABASE_TABLE_NAME.noteSnapshots } as const;
    await recovered.updateEntry('snap', () => ({ value: 'x' }), snapshots);
    expect(await recovered.getEntry('snap', snapshots)).toEqual({
      found: true,
      value: 'x',
    });
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

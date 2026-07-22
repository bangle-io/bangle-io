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
  it('bounds queued opens without failing immediately on blocked, then recovers', async () => {
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

    const createService = (openTimeoutMs = 20) => {
      const { commonOpts, controller } = createTestEnvironment();
      const context = {
        ctx: commonOpts,
        serviceContext: {
          abortSignal: commonOpts.rootAbortSignal,
        },
      };
      return {
        controller,
        service: new IdbDatabaseService(context, null, { openTimeoutMs }),
      };
    };

    // A blocked signal is informational, not terminal: a cooperative old tab
    // may still close before the timeout. This genuinely stuck tab does not,
    // so queued requests fail only after their bounded wait.
    const first = createService();
    const firstMount = first.service.mount();
    let firstSettled = false;
    void firstMount.then(
      () => {
        firstSettled = true;
      },
      () => {
        firstSettled = true;
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(firstSettled).toBe(false);
    await expect(firstMount).rejects.toThrow(
      'Close or reload other Bangle tabs',
    );

    // Aborting a later mount stops waiting immediately. Its uncancellable
    // open request remains queued, but closes itself if it eventually succeeds.
    const aborted = createService(1_000);
    const abortedMount = aborted.service.mount();
    aborted.controller.abort(new Error('mount stopped'));
    await expect(abortedMount).rejects.toThrow('mount stopped');

    const second = createService();
    await expect(second.service.mount()).rejects.toThrow(
      'could not open its database in time',
    );

    // IndexedDB completes the queued requests after the blocker closes. The
    // failed services close their late connections, so a reload can recover.
    oldTabDb.close();
    const recovered = createService();
    await recovered.service.mount();
    const snapshots = { tableName: DATABASE_TABLE_NAME.noteSnapshots } as const;
    await recovered.service.updateEntry(
      'snap',
      () => ({ value: 'x' }),
      snapshots,
    );
    expect(await recovered.service.getEntry('snap', snapshots)).toEqual({
      found: true,
      value: 'x',
    });
    recovered.controller.abort();
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

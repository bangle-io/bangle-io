/**
 * @vitest-environment happy-dom
 */

import { DATABASE_TABLE_NAME } from '@bangle.io/constants';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import type {
  DatabaseQueryOptions,
  DesktopConfigBridge,
} from '@bangle.io/types';
import { describe, expect, it, vi } from 'vitest';
import {
  containsFileSystemHandle,
  DesktopHybridDatabaseService,
} from '../desktop-hybrid-database';
import { DesktopNativeDatabaseService } from '../desktop-native-database';
import { MemoryDatabaseService } from '../memory-database';

const options: DatabaseQueryOptions = {
  tableName: DATABASE_TABLE_NAME.workspaceInfo,
};

/**
 * Stand-in for a native-FS directory handle. A real `FileSystemDirectoryHandle`
 * is a platform object that `structuredClone` (used by the change bus) can copy;
 * a plain object with a function property cannot. Using a class keeps the
 * `requestPermission` method on the prototype so `structuredClone` skips it
 * (copying only own-enumerable `kind`/`name`) while direct access still detects
 * the handle.
 */
class FakeDirectoryHandle {
  kind = 'directory' as const;
  name = 'my-folder';
  async requestPermission() {
    return 'granted' as const;
  }
}

function fakeDirHandle(): FakeDirectoryHandle {
  return new FakeDirectoryHandle();
}

/** In-memory `DesktopConfigBridge` that mirrors the main-process ConfigStore. */
function makeFakeBridge(): DesktopConfigBridge {
  const tables = new Map<string, Map<string, unknown>>();
  const table = (name: string) => {
    let t = tables.get(name);
    if (!t) {
      t = new Map();
      tables.set(name, t);
    }
    return t;
  };
  return {
    async getEntry(key, opts) {
      const t = table(opts.tableName);
      return { found: t.has(key), value: t.get(key) };
    },
    async getAllEntries(opts) {
      return [...table(opts.tableName).values()];
    },
    async putEntry(key, value, opts) {
      table(opts.tableName).set(key, value);
    },
    async deleteEntry(key, opts) {
      table(opts.tableName).delete(key);
    },
  };
}

async function setup() {
  const { commonOpts } = makeTestCommonOpts();
  const context = {
    ctx: commonOpts,
    serviceContext: { abortSignal: commonOpts.rootAbortSignal },
  };

  const native = new DesktopNativeDatabaseService(context, null, {
    bridge: makeFakeBridge(),
  });
  const idb = new MemoryDatabaseService(context, null);
  const hybrid = new DesktopHybridDatabaseService(context, {
    nativeConfigDatabase: native,
    idbDatabase: idb,
  });
  await hybrid.mount();

  return { hybrid, native, idb };
}

describe('containsFileSystemHandle', () => {
  it('detects a top-level or nested handle and ignores plain data', () => {
    expect(containsFileSystemHandle(fakeDirHandle())).toBe(true);
    expect(
      containsFileSystemHandle({
        metadata: { rootDirHandle: fakeDirHandle() },
      }),
    ).toBe(true);
    expect(containsFileSystemHandle([1, { a: fakeDirHandle() }])).toBe(true);
    expect(containsFileSystemHandle({ name: 'ws', type: 'browser' })).toBe(
      false,
    );
    expect(containsFileSystemHandle(null)).toBe(false);
  });

  it('does not infinitely recurse on cyclic values', () => {
    const cyclic: Record<string, unknown> = { name: 'ws' };
    cyclic.self = cyclic;
    expect(containsFileSystemHandle(cyclic)).toBe(false);
  });
});

describe('DesktopHybridDatabaseService', () => {
  it('routes serializable records to the native store', async () => {
    const { hybrid, native, idb } = await setup();

    await hybrid.updateEntry(
      'ws1',
      () => ({ value: { name: 'ws1', type: 'browser', metadata: {} } }),
      options,
    );

    expect((await native.getEntry('ws1', options)).found).toBe(true);
    expect((await idb.getEntry('ws1', options)).found).toBe(false);
    expect(await hybrid.getEntry('ws1', options)).toEqual({
      found: true,
      value: { name: 'ws1', type: 'browser', metadata: {} },
    });
  });

  it('routes native-FS handle records to IndexedDB', async () => {
    const { hybrid, native, idb } = await setup();
    const value = {
      name: 'ws2',
      type: 'native-fs',
      metadata: { rootDirHandle: fakeDirHandle() },
    };

    await hybrid.updateEntry('ws2', () => ({ value }), options);

    expect((await idb.getEntry('ws2', options)).found).toBe(true);
    expect((await native.getEntry('ws2', options)).found).toBe(false);
    expect((await hybrid.getEntry('ws2', options)).found).toBe(true);
  });

  it('merges getAllEntries across both backends', async () => {
    const { hybrid } = await setup();
    await hybrid.updateEntry(
      'browser-ws',
      () => ({ value: { name: 'browser-ws', metadata: {} } }),
      options,
    );
    await hybrid.updateEntry(
      'native-ws',
      () => ({
        value: {
          name: 'native-ws',
          metadata: { rootDirHandle: fakeDirHandle() },
        },
      }),
      options,
    );

    const all = (await hybrid.getAllEntries(options)) as Array<{
      name: string;
    }>;
    expect(all.map((v) => v.name).sort()).toEqual(['browser-ws', 'native-ws']);
  });

  it('moves a record to IndexedDB and deletes the stale native copy', async () => {
    const { hybrid, native, idb } = await setup();

    await hybrid.updateEntry(
      'ws',
      () => ({ value: { name: 'ws', metadata: {} } }),
      options,
    );
    expect((await native.getEntry('ws', options)).found).toBe(true);

    // The workspace becomes native-FS (gains a handle) -> must live in IDB now.
    await hybrid.updateEntry(
      'ws',
      (existing) => ({
        value: {
          ...(existing.value as Record<string, unknown>),
          metadata: { rootDirHandle: fakeDirHandle() },
        },
      }),
      options,
    );

    expect((await native.getEntry('ws', options)).found).toBe(false);
    expect((await idb.getEntry('ws', options)).found).toBe(true);
    // No duplicate across stores.
    expect(await hybrid.getAllEntries(options)).toHaveLength(1);
  });

  it('notifies subscribers on changes from either backend', async () => {
    const { hybrid } = await setup();
    const callback = vi.fn();
    const controller = new AbortController();
    hybrid.subscribe(options, callback, controller.signal);

    await hybrid.updateEntry(
      'browser-ws',
      () => ({ value: { name: 'browser-ws', metadata: {} } }),
      options,
    );
    await hybrid.updateEntry(
      'native-ws',
      () => ({
        value: {
          name: 'native-ws',
          metadata: { rootDirHandle: fakeDirHandle() },
        },
      }),
      options,
    );

    const keys = callback.mock.calls.map((call) => call[0].key);
    expect(keys).toContain('browser-ws');
    expect(keys).toContain('native-ws');

    controller.abort();
  });
});

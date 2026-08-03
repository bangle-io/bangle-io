import { closeSync, openSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  getCiLockFile,
  listCiScripts,
  releaseCiLock,
  tryAcquireCiLock,
} from './local-ci-check.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function createLockPath() {
  const directory = await mkdtemp(join(tmpdir(), 'bangle-local-ci-'));
  temporaryDirectories.push(directory);
  return join(directory, 'lock');
}

function owner(pid = process.pid) {
  return {
    pid,
    cwd: '/tmp/bangle-worktree',
    hostname: 'test-host',
    startedAt: '2026-08-03T00:00:00.000Z',
  };
}

describe('listCiScripts', () => {
  it('returns root CI scripts in reverse alphabetical order', () => {
    expect(
      listCiScripts({
        scripts: {
          build: 'vite build',
          'e2e:ci': 'playwright test',
          'lint:ci': 'biome ci .',
          'test:ci': 'vitest run',
        },
      }),
    ).toEqual(['test:ci', 'lint:ci', 'e2e:ci']);
  });

  it.each([{}, { scripts: null }, { scripts: [] }])(
    'rejects an invalid scripts field',
    (packageJson) => {
      expect(() => listCiScripts(packageJson)).toThrow(
        'package.json must define a scripts object.',
      );
    },
  );

  it('rejects a package without CI scripts', () => {
    expect(() => listCiScripts({ scripts: { build: 'vite build' } })).toThrow(
      'package.json does not define any scripts ending in :ci.',
    );
  });
});

describe('CI lock', () => {
  it('uses the Git common directory so linked worktrees share the lock', () => {
    expect(getCiLockFile('../main/.git', '/repo/worktree')).toBe(
      '/repo/main/.git/bangle-local-ci.lock',
    );
  });

  it('reports the live owner instead of taking its lock', async () => {
    const lockPath = await createLockPath();
    const currentOwner = owner();

    expect(tryAcquireCiLock(lockPath, currentOwner)).toEqual({
      acquired: true,
      owner: currentOwner,
    });
    expect(tryAcquireCiLock(lockPath, owner(process.pid + 1))).toEqual({
      acquired: false,
      owner: currentOwner,
    });
  });

  it('recovers a lock whose owner is no longer running', async () => {
    const lockPath = await createLockPath();
    const staleOwner = owner(2_147_483_647);
    const currentOwner = owner();
    tryAcquireCiLock(lockPath, staleOwner);

    expect(tryAcquireCiLock(lockPath, currentOwner)).toEqual({
      acquired: true,
      owner: currentOwner,
    });
    expect(JSON.parse(readFileSync(lockPath, 'utf8'))).toEqual(currentOwner);
  });

  it('does not steal a newly created lock before its owner file is written', async () => {
    const lockPath = await createLockPath();
    const descriptor = openSync(lockPath, 'wx');
    closeSync(descriptor);

    expect(tryAcquireCiLock(lockPath, owner())).toEqual({
      acquired: false,
      owner: null,
    });
  });

  it('only lets the recorded owner release the lock', async () => {
    const lockPath = await createLockPath();
    tryAcquireCiLock(lockPath, owner());

    expect(releaseCiLock(lockPath, process.pid + 1)).toBe(false);
    expect(releaseCiLock(lockPath)).toBe(true);
  });
});

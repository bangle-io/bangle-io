import { closeSync, openSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  getCiLockFile,
  parseCommandArguments,
  releaseCiLock,
  tryAcquireCiLock,
} from '../local-ci-check';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createLockPath(): Promise<string> {
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

describe('parseCommandArguments', () => {
  it('uses no command for the aggregate runner', () => {
    expect(parseCommandArguments([])).toBeNull();
  });

  it('returns a command following the run subcommand', () => {
    expect(parseCommandArguments(['run', 'pnpm', 'test:ci'])).toEqual([
      'pnpm',
      'test:ci',
    ]);
  });

  it.each([
    ['run'],
    ['--', 'pnpm', 'test:ci'],
  ])('rejects invalid command arguments', (...args) => {
    expect(() => parseCommandArguments(args)).toThrow(
      'Expected either no arguments or: run <command> [...args].',
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

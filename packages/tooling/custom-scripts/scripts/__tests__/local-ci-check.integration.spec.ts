import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  getCiLockFile,
  isProcessRunning,
  releaseCiLock,
  tryAcquireCiLock,
} from '../local-ci-check';

const RUNNER_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../local-ci-check.ts',
);
const INHERITED_LOCK_ENV = 'BANGLE_LOCAL_CI_LOCKED';
const HOLD_UNTIL_FILE_SCRIPT = `
const { existsSync } = require('node:fs');
console.log('holding:' + process.pid);
const interval = setInterval(() => {
  if (existsSync(process.argv[1])) {
    clearInterval(interval);
  }
}, 20);
`;
const SPAWN_GRANDCHILD_SCRIPT = `
const { spawn } = require('node:child_process');
const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
console.log('grandchild:' + child.pid);
setInterval(() => {}, 1000);
`;

type CapturedProcess = {
  child: ChildProcess;
  readOutput: () => string;
};

type ProcessExit = {
  code: number | null;
  signal: NodeJS.Signals | null;
};

const temporaryDirectories: string[] = [];
const runnerProcesses = new Set<ChildProcess>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readActiveChildPid(lockFile: string): number | null {
  if (!existsSync(lockFile)) {
    return null;
  }
  const owner: unknown = JSON.parse(readFileSync(lockFile, 'utf8'));
  if (
    !isRecord(owner) ||
    typeof owner.activeChildPid !== 'number' ||
    !Number.isInteger(owner.activeChildPid)
  ) {
    return null;
  }
  return owner.activeChildPid;
}

function stopTestProcessTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      const commandProcessor = process.env.ComSpec;
      if (commandProcessor) {
        execFileSync(
          commandProcessor,
          ['/d', '/s', '/c', `taskkill /pid ${pid} /t /f`],
          { stdio: 'ignore' },
        );
      }
    } else {
      execFileSync('kill', ['-KILL', '--', `-${pid}`], { stdio: 'ignore' });
    }
  } catch {
    // Best-effort cleanup for a process tree that may already have exited.
  }
}

function waitForExit(child: ChildProcess): Promise<ProcessExit> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolveExit) => {
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
  });
}

function cleanRunnerEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env[INHERITED_LOCK_ENV];
  return env;
}

function startRunner(
  cwd: string,
  args: readonly string[],
  env = cleanRunnerEnvironment(),
): CapturedProcess {
  const child = spawn('bun', [RUNNER_PATH, ...args], {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  runnerProcesses.add(child);
  let output = '';
  for (const stream of [child.stdout, child.stderr]) {
    stream?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
  }
  return { child, readOutput: () => output };
}

async function expectOutput(
  child: CapturedProcess,
  expected: string,
): Promise<void> {
  await expect
    .poll(child.readOutput, { interval: 25, timeout: 10_000 })
    .toContain(expected);
}

function readPid(output: string, prefix: string): number {
  const match = output.match(new RegExp(`${prefix}(\\d+)`));
  const value = match?.[1];
  if (!value) {
    throw new Error(`Expected ${prefix}<pid> in output: ${output}`);
  }
  return Number(value);
}

async function createGitRepository(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'bangle-local-ci-cli-'));
  temporaryDirectories.push(directory);
  execFileSync('git', ['init', '--quiet'], { cwd: directory });
  return directory;
}

function testOwner(pid = process.pid) {
  return {
    pid,
    cwd: '/tmp/bangle-worktree',
    hostname: 'test-host',
    startedAt: '2026-08-03T00:00:00.000Z',
  };
}

afterEach(async () => {
  const activeChildPids = temporaryDirectories.flatMap((directory) => {
    const pid = readActiveChildPid(getCiLockFile('.git', directory));
    return pid === null ? [] : [pid];
  });
  for (const pid of activeChildPids) {
    stopTestProcessTree(pid);
  }
  for (const child of runnerProcesses) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
    }
  }
  await Promise.all([...runnerProcesses].map(waitForExit));
  runnerProcesses.clear();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe.sequential('local CI CLI', () => {
  it('queues a competing runner until the lock owner exits', async () => {
    const repository = await createGitRepository();
    const releaseFile = join(repository, 'release-first');
    const first = startRunner(repository, [
      'run',
      process.execPath,
      '-e',
      HOLD_UNTIL_FILE_SCRIPT,
      releaseFile,
    ]);
    await expectOutput(first, 'holding:');

    const second = startRunner(repository, [
      'run',
      process.execPath,
      '-e',
      "console.log('second-started')",
    ]);
    await expectOutput(second, 'Waiting for the Bangle local CI lock');
    expect(second.readOutput()).not.toContain('second-started');

    await writeFile(releaseFile, 'release');
    expect((await waitForExit(first.child)).code).toBe(0);
    await expectOutput(second, 'second-started');
    expect((await waitForExit(second.child)).code).toBe(0);
  }, 15_000);

  it('honors an inherited lock without replacing or releasing it', async () => {
    const repository = await createGitRepository();
    const lockFile = getCiLockFile('.git', repository);
    const owner = testOwner();
    expect(tryAcquireCiLock(lockFile, owner)).toEqual({
      acquired: true,
      owner,
    });
    const env = cleanRunnerEnvironment();
    env[INHERITED_LOCK_ENV] = '1';

    const inherited = startRunner(
      repository,
      ['run', process.execPath, '-e', "console.log('inherited-started')"],
      env,
    );
    await expectOutput(inherited, 'inherited-started');
    expect((await waitForExit(inherited.child)).code).toBe(0);
    expect(JSON.parse(readFileSync(lockFile, 'utf8'))).toEqual(owner);
    expect(releaseCiLock(lockFile)).toBe(true);
  });

  describe.runIf(process.platform !== 'win32')('POSIX process trees', () => {
    it.each([
      { exitCode: 130, signal: 'SIGINT' as const },
      { exitCode: 143, signal: 'SIGTERM' as const },
    ])('stops descendants and releases the lock on $signal', async ({
      exitCode,
      signal,
    }) => {
      const repository = await createGitRepository();
      const lockFile = getCiLockFile('.git', repository);
      const runner = startRunner(repository, [
        'run',
        process.execPath,
        '-e',
        SPAWN_GRANDCHILD_SCRIPT,
      ]);
      await expectOutput(runner, 'grandchild:');
      const grandchildPid = readPid(runner.readOutput(), 'grandchild:');
      await expect
        .poll(() => readActiveChildPid(lockFile), {
          interval: 25,
          timeout: 5_000,
        })
        .toBeGreaterThan(0);

      expect(runner.child.kill(signal)).toBe(true);
      expect((await waitForExit(runner.child)).code).toBe(exitCode);
      await expect
        .poll(() => isProcessRunning(grandchildPid), {
          interval: 25,
          timeout: 5_000,
        })
        .toBe(false);
      expect(existsSync(lockFile)).toBe(false);
    }, 15_000);

    it('keeps contenders queued after hard coordinator death', async () => {
      const repository = await createGitRepository();
      const lockFile = getCiLockFile('.git', repository);
      const releaseFile = join(repository, 'release-orphan');
      const first = startRunner(repository, [
        'run',
        process.execPath,
        '-e',
        HOLD_UNTIL_FILE_SCRIPT,
        releaseFile,
      ]);
      await expectOutput(first, 'holding:');
      const activeChildPid = readPid(first.readOutput(), 'holding:');
      await expect
        .poll(() => readActiveChildPid(lockFile), {
          interval: 25,
          timeout: 5_000,
        })
        .toBe(activeChildPid);

      expect(first.child.kill('SIGKILL')).toBe(true);
      expect((await waitForExit(first.child)).signal).toBe('SIGKILL');
      expect(isProcessRunning(activeChildPid)).toBe(true);

      const contender = startRunner(repository, [
        'run',
        process.execPath,
        '-e',
        "console.log('contender-started')",
      ]);
      await expectOutput(contender, 'Waiting for the Bangle local CI lock');
      expect(contender.readOutput()).not.toContain('contender-started');

      await writeFile(releaseFile, 'release');
      await expect
        .poll(() => isProcessRunning(activeChildPid), {
          interval: 25,
          timeout: 5_000,
        })
        .toBe(false);
      await expectOutput(contender, 'contender-started');
      expect((await waitForExit(contender.child)).code).toBe(0);
    }, 15_000);
  });
});

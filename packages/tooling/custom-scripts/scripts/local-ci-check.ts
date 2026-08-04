import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import {
  closeSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { hostname } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

import { isMainModule } from '../lib';
import { readCiScripts } from './list-ci-scripts';

const LOCK_FILE_NAME = 'bangle-local-ci.lock';
const INCOMPLETE_LOCK_GRACE_MS = 10_000;
const LOCK_POLL_MS = 1_000;
const LOCK_STATUS_MS = 30_000;
const INHERITED_LOCK_ENV = 'BANGLE_LOCAL_CI_LOCKED';
const HANDLED_SIGNALS = ['SIGHUP', 'SIGINT', 'SIGTERM'] as const;

type HandledSignal = (typeof HANDLED_SIGNALS)[number];

type LockOwner = Record<string, unknown> & {
  pid: number;
  cwd: string;
  hostname: string;
  startedAt: string;
};

type LockRecord = Record<string, unknown>;

type LockAttempt = {
  acquired: boolean;
  owner: LockRecord | null;
};

function isRecord(value: unknown): value is LockRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return isRecord(error) && error.code === code;
}

export function parseCommandArguments(
  args: readonly string[],
): string[] | null {
  if (args.length === 0) {
    return null;
  }
  if (args[0] !== 'run' || args.length === 1) {
    throw new Error(
      'Expected either no arguments or: run <command> [...args].',
    );
  }
  return args.slice(1);
}

export function getCiLockFile(
  commonGitDirectory: string,
  cwd = process.cwd(),
): string {
  const directory = isAbsolute(commonGitDirectory)
    ? commonGitDirectory
    : resolve(cwd, commonGitDirectory);
  return join(directory, LOCK_FILE_NAME);
}

export function isProcessRunning(pid: unknown): boolean {
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return hasErrorCode(error, 'EPERM');
  }
}

function readLockOwner(lockFile: string): LockRecord | null {
  try {
    const owner: unknown = JSON.parse(readFileSync(lockFile, 'utf8'));
    return isRecord(owner) ? owner : null;
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT') || error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

function isFreshIncompleteLock(lockFile: string): boolean {
  try {
    return Date.now() - statSync(lockFile).mtimeMs < INCOMPLETE_LOCK_GRACE_MS;
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return false;
    }
    throw error;
  }
}

function removeStaleLock(lockFile: string): boolean {
  const staleFile = `${lockFile}.stale-${process.pid}-${Date.now()}`;
  try {
    renameSync(lockFile, staleFile);
    unlinkSync(staleFile);
    return true;
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return false;
    }
    throw error;
  }
}

export function tryAcquireCiLock(
  lockFile: string,
  owner: LockOwner,
): LockAttempt {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(lockFile, 'wx');
    writeFileSync(descriptor, `${JSON.stringify(owner, null, 2)}\n`);
    closeSync(descriptor);
    descriptor = undefined;
    return { acquired: true, owner };
  } catch (error) {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    if (!hasErrorCode(error, 'EEXIST')) {
      throw error;
    }
  }

  const currentOwner = readLockOwner(lockFile);
  if (
    (currentOwner && isProcessRunning(currentOwner.pid)) ||
    (!currentOwner && isFreshIncompleteLock(lockFile))
  ) {
    return { acquired: false, owner: currentOwner };
  }

  return removeStaleLock(lockFile)
    ? tryAcquireCiLock(lockFile, owner)
    : { acquired: false, owner: null };
}

export function releaseCiLock(lockFile: string, pid = process.pid): boolean {
  const owner = readLockOwner(lockFile);
  if (!owner || owner.pid !== pid) {
    return false;
  }
  unlinkSync(lockFile);
  return true;
}

function formatOwner(owner: LockRecord | null): string {
  if (!owner) {
    return 'another local CI process';
  }
  return [
    Number.isInteger(owner.pid) ? `PID ${owner.pid}` : null,
    typeof owner.cwd === 'string' ? owner.cwd : null,
    typeof owner.hostname === 'string' ? owner.hostname : null,
  ]
    .filter(Boolean)
    .join(' in ');
}

async function acquireCiLock(
  lockFile: string,
  owner: LockOwner,
  wasInterrupted: () => boolean,
): Promise<boolean> {
  let lastMessageAt = 0;
  let lastOwner = '';
  while (!wasInterrupted()) {
    const result = tryAcquireCiLock(lockFile, owner);
    if (result.acquired) {
      return true;
    }

    const description = formatOwner(result.owner);
    if (
      description !== lastOwner ||
      Date.now() - lastMessageAt >= LOCK_STATUS_MS
    ) {
      console.log(
        `Waiting for the Bangle local CI lock held by ${description}.`,
      );
      lastOwner = description;
      lastMessageAt = Date.now();
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, LOCK_POLL_MS));
  }
  return false;
}

function stopProcessTree(
  child: ChildProcess | null,
  signal: HandledSignal,
): void {
  if (
    !child?.pid ||
    (child.exitCode !== null && child.exitCode !== undefined) ||
    (child.signalCode !== null && child.signalCode !== undefined)
  ) {
    return;
  }
  try {
    if (process.platform === 'win32') {
      const commandProcessor = process.env.ComSpec;
      if (!commandProcessor) {
        throw new Error('ComSpec is required to stop a Windows process tree.');
      }
      execFileSync(
        commandProcessor,
        ['/d', '/s', '/c', `taskkill /pid ${child.pid} /t /f`],
        { stdio: 'ignore' },
      );
    } else {
      execFileSync('kill', [`-${signal}`, '--', `-${child.pid}`], {
        stdio: 'ignore',
      });
    }
  } catch (error) {
    if (!hasErrorCode(error, 'ESRCH')) {
      console.error(`Failed to stop the active CI process tree: ${error}`);
    }
  }
}

function runCommand(
  command: string,
  args: readonly string[],
  setActiveChild: (child: ChildProcess | null) => void,
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      detached: process.platform !== 'win32',
      env,
      stdio: 'inherit',
    });
    setActiveChild(child);
    child.once('error', rejectRun);
    child.once('exit', (code) => {
      setActiveChild(null);
      resolveRun(code ?? 1);
    });
  });
}

function repositoryContext(): { lockFile: string; root: string } {
  const cwd = process.cwd();
  const commonGitDirectory = execFileSync(
    'git',
    ['rev-parse', '--git-common-dir'],
    { cwd, encoding: 'utf8' },
  ).trim();
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
  }).trim();
  return { lockFile: getCiLockFile(commonGitDirectory, cwd), root };
}

async function main(): Promise<void> {
  const { lockFile, root } = repositoryContext();
  const requestedCommand = parseCommandArguments(process.argv.slice(2));
  const executable = requestedCommand?.[0];
  const scripts = requestedCommand
    ? []
    : await readCiScripts(join(root, 'package.json'));
  const owner: LockOwner = {
    pid: process.pid,
    cwd: root,
    hostname: hostname(),
    startedAt: new Date().toISOString(),
  };

  let activeChild: ChildProcess | null = null;
  let receivedSignal: HandledSignal | null = null;
  const handlers = new Map<HandledSignal, () => void>();
  for (const signal of HANDLED_SIGNALS) {
    const handler = () => {
      receivedSignal ??= signal;
      stopProcessTree(activeChild, signal);
    };
    handlers.set(signal, handler);
    process.on(signal, handler);
  }

  let hasLock = false;
  const failures: string[] = [];
  try {
    const inheritedLock = process.env[INHERITED_LOCK_ENV] === '1';
    hasLock =
      inheritedLock ||
      (await acquireCiLock(lockFile, owner, () => receivedSignal !== null));
    if (hasLock && !inheritedLock) {
      console.log(`Acquired the Bangle local CI lock for ${root}.`);
    }

    if (executable && hasLock && !receivedSignal) {
      const args = requestedCommand?.slice(1) ?? [];
      const code = await runCommand(executable, args, (child) => {
        activeChild = child;
        if (child && receivedSignal) {
          stopProcessTree(child, receivedSignal);
        }
      });
      if (code !== 0) {
        failures.push([executable, ...args].join(' '));
      }
    } else if (hasLock && !requestedCommand) {
      for (const script of scripts) {
        if (receivedSignal) {
          break;
        }
        console.log('----------------------------------------');
        console.log(`Running script: ${script}`);
        const code = await runCommand(
          'pnpm',
          ['run', script],
          (child) => {
            activeChild = child;
            if (child && receivedSignal) {
              stopProcessTree(child, receivedSignal);
            }
          },
          { ...process.env, [INHERITED_LOCK_ENV]: '1' },
        );
        if (code !== 0) {
          failures.push(script);
        }
      }
    }
  } finally {
    if (hasLock && process.env[INHERITED_LOCK_ENV] !== '1') {
      releaseCiLock(lockFile);
    }
    for (const [signal, handler] of handlers) {
      process.off(signal, handler);
    }
  }

  if (receivedSignal) {
    const signalExitCodes: Record<HandledSignal, number> = {
      SIGHUP: 129,
      SIGINT: 130,
      SIGTERM: 143,
    };
    process.exitCode = signalExitCodes[receivedSignal];
  } else if (failures.length > 0) {
    console.error('The following scripts failed:');
    for (const script of failures) {
      console.error(`- ${script}`);
    }
    process.exitCode = 1;
  } else if (!requestedCommand) {
    console.log('All scripts ran successfully.');
  }
}

if (isMainModule(import.meta.url)) {
  await main();
}

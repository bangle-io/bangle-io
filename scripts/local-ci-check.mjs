#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
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
import { pathToFileURL } from 'node:url';

const LOCK_FILE_NAME = 'bangle-local-ci.lock';
const INCOMPLETE_LOCK_GRACE_MS = 10_000;
const LOCK_POLL_MS = 1_000;
const LOCK_STATUS_MS = 30_000;
const INHERITED_LOCK_ENV = 'BANGLE_LOCAL_CI_LOCKED';

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function listCiScripts(packageJson) {
  if (!isRecord(packageJson) || !isRecord(packageJson.scripts)) {
    throw new Error('package.json must define a scripts object.');
  }

  const scripts = Object.keys(packageJson.scripts)
    .filter((script) => script.endsWith(':ci'))
    .sort()
    .reverse();
  if (scripts.length === 0) {
    throw new Error('package.json does not define any scripts ending in :ci.');
  }
  return scripts;
}

export function getCiLockFile(commonGitDirectory, cwd = process.cwd()) {
  const directory = isAbsolute(commonGitDirectory)
    ? commonGitDirectory
    : resolve(cwd, commonGitDirectory);
  return join(directory, LOCK_FILE_NAME);
}

export function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function readLockOwner(lockFile) {
  try {
    const owner = JSON.parse(readFileSync(lockFile, 'utf8'));
    return isRecord(owner) ? owner : null;
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

function isFreshIncompleteLock(lockFile) {
  try {
    return Date.now() - statSync(lockFile).mtimeMs < INCOMPLETE_LOCK_GRACE_MS;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function removeStaleLock(lockFile) {
  const staleFile = `${lockFile}.stale-${process.pid}-${Date.now()}`;
  try {
    renameSync(lockFile, staleFile);
    unlinkSync(staleFile);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export function tryAcquireCiLock(lockFile, owner) {
  let descriptor;
  try {
    descriptor = openSync(lockFile, 'wx');
    writeFileSync(descriptor, `${JSON.stringify(owner, null, 2)}\n`);
    closeSync(descriptor);
    return { acquired: true, owner };
  } catch (error) {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    if (error?.code !== 'EEXIST') {
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

export function releaseCiLock(lockFile, pid = process.pid) {
  const owner = readLockOwner(lockFile);
  if (!owner || owner.pid !== pid) {
    return false;
  }
  unlinkSync(lockFile);
  return true;
}

function formatOwner(owner) {
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

async function acquireCiLock(lockFile, owner, wasInterrupted) {
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
      console.log(`Waiting for the Bangle local CI lock held by ${description}.`);
      lastOwner = description;
      lastMessageAt = Date.now();
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, LOCK_POLL_MS));
  }
  return false;
}

function stopProcessTree(child, signal) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) {
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
      process.kill(-child.pid, signal);
    }
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      console.error(`Failed to stop the active CI process tree: ${error}`);
    }
  }
}

function runCommand(command, args, setActiveChild, env = process.env) {
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

function repositoryContext() {
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

async function main() {
  const { lockFile, root } = repositoryContext();
  const separatorIndex = process.argv.indexOf('--');
  const command =
    separatorIndex === -1 ? null : process.argv.slice(separatorIndex + 1);
  if (command?.length === 0) {
    throw new Error('Expected a command after --.');
  }
  const scripts = command
    ? []
    : listCiScripts(
        JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')),
      );
  const owner = {
    pid: process.pid,
    cwd: root,
    hostname: hostname(),
    startedAt: new Date().toISOString(),
  };

  let activeChild = null;
  let receivedSignal = null;
  const handlers = new Map();
  for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM']) {
    const handler = () => {
      receivedSignal ??= signal;
      stopProcessTree(activeChild, signal);
    };
    handlers.set(signal, handler);
    process.on(signal, handler);
  }

  let hasLock = false;
  const failures = [];
  try {
    const inheritedLock = process.env[INHERITED_LOCK_ENV] === '1';
    hasLock =
      inheritedLock ||
      (await acquireCiLock(lockFile, owner, () => receivedSignal !== null));
    if (hasLock && !inheritedLock) {
      console.log(`Acquired the Bangle local CI lock for ${root}.`);
    }

    if (command && hasLock && !receivedSignal) {
      const code = await runCommand(command[0], command.slice(1), (child) => {
        activeChild = child;
        if (child && receivedSignal) {
          stopProcessTree(child, receivedSignal);
        }
      });
      if (code !== 0) {
        failures.push(command.join(' '));
      }
    } else if (hasLock) {
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
    process.exitCode = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 }[receivedSignal];
  } else if (failures.length > 0) {
    console.error('The following scripts failed:');
    failures.forEach((script) => console.error(`- ${script}`));
    process.exitCode = 1;
  } else if (!command) {
    console.log('All scripts ran successfully.');
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}

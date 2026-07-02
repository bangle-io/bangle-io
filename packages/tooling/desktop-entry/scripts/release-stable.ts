#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import {
  isStableVersion,
  resolveDesktopReleaseMetadata,
} from '../src/release-metadata';

const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

function parseVersion(argv: readonly string[]): string {
  const versionFlagIndex = argv.indexOf('--version');
  const version =
    versionFlagIndex >= 0 ? argv[versionFlagIndex + 1] : undefined;

  if (!version || !isStableVersion(version)) {
    throw new Error('Usage: pnpm desktop:release:stable -- --version X.Y.Z');
  }

  return version;
}

function runCommand(command: string, args: readonly string[]): void {
  execFileSync(command, [...args], {
    cwd: WORKSPACE_ROOT,
    stdio: 'inherit',
  });
}

function readCommand(command: string, args: readonly string[]): string {
  return execFileSync(command, [...args], {
    cwd: WORKSPACE_ROOT,
    encoding: 'utf8',
  });
}

function assertCleanGitState(): void {
  const status = readCommand('git', ['status', '--porcelain']);
  if (status.trim()) {
    throw new Error(
      `Stable desktop release requires a clean git state before versioning:\n${status}`,
    );
  }
}

function updateRootVersion(version: string): void {
  const packageJsonPath = resolve(WORKSPACE_ROOT, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    version?: string;
  };

  if (packageJson.version === version) {
    return;
  }

  packageJson.version = version;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function requireManualConfirmation(version: string): Promise<void> {
  const prompt = createInterface({ input, output });
  try {
    const answer = await prompt.question(
      `Manual RC smoke complete? Type "release ${version}" to commit/tag/push: `,
    );
    if (answer.trim() !== `release ${version}`) {
      throw new Error('Stable desktop release cancelled by manual smoke gate.');
    }
  } finally {
    prompt.close();
  }
}

async function run(): Promise<void> {
  const version = parseVersion(process.argv.slice(2));
  const metadata = resolveDesktopReleaseMetadata(version);

  assertCleanGitState();
  updateRootVersion(version);

  runCommand('pnpm', ['local-ci-check']);
  runCommand('pnpm', ['desktop:build']);
  runCommand('pnpm', [
    'desktop:dist',
    '--',
    '--channel',
    metadata.channel,
    '--version',
    metadata.version,
  ]);
  runCommand('pnpm', ['--filter', '@bangle.io/desktop-entry', 'run', 'smoke']);

  await requireManualConfirmation(version);

  runCommand('git', ['add', 'package.json', 'pnpm-lock.yaml']);
  runCommand('git', ['commit', '-m', `chore: release v${version}`]);
  runCommand('git', ['tag', `v${version}`]);
  runCommand('git', ['push']);
  runCommand('git', ['push', 'origin', `v${version}`]);
}

void run();

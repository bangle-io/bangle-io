#!/usr/bin/env node

import { appendFileSync } from 'node:fs';
import {
  getRootPackageVersion,
  RELEASE_CHANNELS,
  type ReleaseChannel,
  resolveDesktopReleaseMetadata,
  resolveNightlyVersion,
  validateStableTag,
} from '../src/release-metadata';

interface ResolveArgs {
  readonly channel: ReleaseChannel;
  readonly date?: string;
  readonly githubOutput: boolean;
  readonly runNumber?: string;
  readonly tag?: string;
  readonly version?: string;
}

function parseArgs(argv: readonly string[]): ResolveArgs {
  const args = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    if (arg === '--github-output') {
      args.set('github-output', true);
      continue;
    }
    if (!arg?.startsWith('--')) {
      throw new Error(`Unexpected release metadata argument: ${arg}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }

    args.set(arg.slice(2), value);
    index++;
  }

  const channel = args.get('channel');
  if (!channel || !RELEASE_CHANNELS.includes(channel as ReleaseChannel)) {
    throw new Error(`--channel must be one of ${RELEASE_CHANNELS.join(', ')}.`);
  }

  return {
    channel: channel as ReleaseChannel,
    date: args.get('date') as string | undefined,
    githubOutput: args.get('github-output') === true,
    runNumber: args.get('run-number') as string | undefined,
    tag: args.get('tag') as string | undefined,
    version: args.get('version') as string | undefined,
  };
}

function writeOutput(
  entries: ReadonlyArray<readonly [string, string | boolean]>,
  githubOutput: boolean,
): void {
  const text = entries.map(([key, value]) => `${key}=${value}\n`).join('');

  if (githubOutput) {
    const outputPath = process.env.GITHUB_OUTPUT;
    if (!outputPath) {
      throw new Error('GITHUB_OUTPUT is required with --github-output.');
    }
    appendFileSync(outputPath, text);
    return;
  }

  process.stdout.write(text);
}

function run(): void {
  const args = parseArgs(process.argv.slice(2));
  const rootVersion = getRootPackageVersion();
  const version =
    args.channel === 'nightly'
      ? resolveNightlyVersion({
          rootVersion,
          date:
            args.date ??
            new Date().toISOString().slice(0, 10).replaceAll('-', ''),
          runNumber: args.runNumber ?? process.env.GITHUB_RUN_NUMBER ?? '1',
        })
      : (args.version ??
        validateStableTag({
          tag: args.tag ?? process.env.GITHUB_REF_NAME ?? '',
          packageVersion: rootVersion,
        }));
  const metadata = resolveDesktopReleaseMetadata(version);

  if (metadata.channel !== args.channel) {
    throw new Error(
      `Resolved version ${version} belongs to ${metadata.channel}, not ${args.channel}.`,
    );
  }

  writeOutput(
    [
      ['version', metadata.version],
      ['channel', metadata.channel],
      ['tag', metadata.tag],
      ['release_name', metadata.releaseName],
      ['product_name', metadata.productName],
      ['prerelease', metadata.prerelease],
      ['make_latest', metadata.makeLatest],
    ],
    args.githubOutput,
  );
}

run();

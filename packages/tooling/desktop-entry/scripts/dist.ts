#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RELEASE_CHANNELS,
  type ReleaseChannel,
  resolveDesktopReleaseMetadata,
} from '../src/release-metadata';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, '..');
const WORKSPACE_ROOT = resolve(PACKAGE_ROOT, '../../..');

interface DistArgs {
  readonly channel: ReleaseChannel;
  readonly version: string;
}

function parseArgs(argv: readonly string[]): DistArgs {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }

    if (!arg?.startsWith('--')) {
      throw new Error(`Unexpected desktop dist argument: ${arg}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }

    args.set(arg.slice(2), value);
    index++;
  }

  const channel = args.get('channel');
  const version = args.get('version');

  if (!channel || !RELEASE_CHANNELS.includes(channel as ReleaseChannel)) {
    throw new Error(`--channel must be one of ${RELEASE_CHANNELS.join(', ')}.`);
  }

  if (!version) {
    throw new Error('--version is required.');
  }

  return { channel: channel as ReleaseChannel, version };
}

function hasCodeSigningSecrets(): boolean {
  return Boolean(
    (process.env.CSC_LINK && process.env.CSC_KEY_PASSWORD) ||
      process.env.CSC_NAME,
  );
}

function hasNotarizationSecrets(): boolean {
  const hasApiKey = Boolean(
    process.env.APPLE_API_KEY &&
      process.env.APPLE_API_KEY_ID &&
      process.env.APPLE_API_ISSUER,
  );
  const hasAppleId = Boolean(
    process.env.APPLE_ID &&
      process.env.APPLE_APP_SPECIFIC_PASSWORD &&
      process.env.APPLE_TEAM_ID,
  );
  const hasKeychainProfile = Boolean(
    process.env.APPLE_KEYCHAIN && process.env.APPLE_KEYCHAIN_PROFILE,
  );

  return hasApiKey || hasAppleId || hasKeychainProfile;
}

function requireBuildInputs(): void {
  const requiredFiles = [
    'packages/tooling/browser-entry/dist/index.html',
    'packages/tooling/desktop-entry/dist/main.cjs',
    'packages/tooling/desktop-entry/dist/preload.cjs',
  ];
  const missingFiles = requiredFiles.filter(
    (relativePath) => !existsSync(resolve(WORKSPACE_ROOT, relativePath)),
  );

  if (missingFiles.length > 0) {
    throw new Error(
      `Desktop dist is missing build inputs. Run pnpm desktop:build first. Missing: ${missingFiles.join(
        ', ',
      )}`,
    );
  }
}

function preparePackagedAppDir(
  metadata: ReturnType<typeof resolveDesktopReleaseMetadata>,
): string {
  const appDir = resolve(PACKAGE_ROOT, 'release', 'stage', metadata.channel);
  const packageJson = JSON.parse(
    readFileSync(resolve(PACKAGE_ROOT, 'package.json'), 'utf8'),
  ) as {
    author?: unknown;
    description?: string;
    homepage?: string;
    license?: string;
    name?: string;
  };

  rmSync(appDir, { recursive: true, force: true });
  mkdirSync(appDir, { recursive: true });
  cpSync(resolve(PACKAGE_ROOT, 'dist'), resolve(appDir, 'dist'), {
    recursive: true,
  });

  writeFileSync(
    resolve(appDir, 'package.json'),
    `${JSON.stringify(
      {
        author: packageJson.author,
        dependencies: {},
        description: packageJson.description,
        homepage: packageJson.homepage,
        license: packageJson.license,
        main: 'dist/main.cjs',
        name: packageJson.name,
        productName: metadata.productName,
        version: metadata.version,
      },
      null,
      2,
    )}\n`,
  );

  return appDir;
}

function run(): void {
  const args = parseArgs(process.argv.slice(2));
  const metadata = resolveDesktopReleaseMetadata(args.version);

  if (metadata.channel !== args.channel) {
    throw new Error(
      `Version ${args.version} resolves to channel ${metadata.channel}, not ${args.channel}.`,
    );
  }

  requireBuildInputs();
  const appDir = preparePackagedAppDir(metadata);

  const canSign = hasCodeSigningSecrets();
  const canNotarize = hasNotarizationSecrets();

  if (args.channel === 'latest' && (!canSign || !canNotarize)) {
    throw new Error(
      'Stable desktop releases require macOS signing and notarization secrets. Provide CSC_LINK/CSC_KEY_PASSWORD or CSC_NAME, plus Apple notarization credentials.',
    );
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    BANGLE_RELEASE_VERSION: metadata.version,
    BANGLE_DESKTOP_CHANNEL: metadata.channel,
    BANGLE_DESKTOP_PRODUCT_NAME: metadata.productName,
    BANGLE_DESKTOP_SIGN: canSign ? 'true' : 'false',
    BANGLE_DESKTOP_NOTARIZE: canNotarize ? 'true' : 'false',
  };

  if (args.channel === 'nightly' && !canSign) {
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  }

  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'electron-builder',
      '--mac',
      '--projectDir',
      appDir,
      '--config',
      resolve(PACKAGE_ROOT, 'electron-builder.config.cjs'),
    ],
    {
      cwd: PACKAGE_ROOT,
      env,
      stdio: 'inherit',
    },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`electron-builder failed with exit code ${result.status}`);
  }
}

run();

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RELEASE_CHANNELS = ['latest', 'nightly'] as const;

export type ReleaseChannel = (typeof RELEASE_CHANNELS)[number];

interface DesktopReleaseMetadata {
  readonly version: string;
  readonly channel: ReleaseChannel;
  readonly productName: string;
  readonly releaseName: string;
  readonly tag: string;
  readonly prerelease: boolean;
  readonly makeLatest: boolean;
}

const STABLE_VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const NIGHTLY_VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)-nightly\.(\d{8})\.(\d+)$/;

export function getRootPackageVersion(): string {
  const override = process.env.BANGLE_RELEASE_VERSION?.trim();
  if (override) {
    return override;
  }

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(
    readFileSync(resolve(currentDir, '../../../../package.json'), 'utf8'),
  ) as { readonly version?: unknown };

  if (typeof packageJson.version !== 'string') {
    throw new Error('Root package.json is missing a string version.');
  }

  return packageJson.version;
}

export function isStableVersion(version: string): boolean {
  return STABLE_VERSION_PATTERN.test(version);
}

function isNightlyVersion(version: string): boolean {
  return NIGHTLY_VERSION_PATTERN.test(version);
}

export function resolveUpdateChannel(version: string): ReleaseChannel {
  if (isNightlyVersion(version)) {
    return 'nightly';
  }

  if (isStableVersion(version)) {
    return 'latest';
  }

  throw new Error(
    `Desktop release version must be stable X.Y.Z or nightly X.Y.Z-nightly.YYYYMMDD.N: ${version}`,
  );
}

export function resolveProductName(channel: ReleaseChannel): string {
  return channel === 'nightly' ? 'Bangle.io Nightly' : 'Bangle.io';
}

export function resolveNextStableVersion(version: string): string {
  const stableCore = version.replace(/[-+].*$/, '');
  const match = STABLE_VERSION_PATTERN.exec(stableCore);

  if (!match) {
    throw new Error(`Cannot derive the next stable version from ${version}`);
  }

  const [, major, minor, patch] = match;
  if (major === undefined || minor === undefined || patch === undefined) {
    throw new Error(`Cannot derive the next stable version from ${version}`);
  }

  return `${major}.${minor}.${Number(patch) + 1}`;
}

export function resolveNightlyVersion(input: {
  readonly rootVersion: string;
  readonly date: string;
  readonly runNumber: string | number;
}): string {
  if (!/^\d{8}$/.test(input.date)) {
    throw new Error(`Nightly date must use YYYYMMDD: ${input.date}`);
  }

  const runNumber =
    typeof input.runNumber === 'number'
      ? input.runNumber
      : Number(input.runNumber);
  if (!Number.isInteger(runNumber) || runNumber < 1) {
    throw new Error('Nightly run number must be a positive integer');
  }

  return `${resolveNextStableVersion(input.rootVersion)}-nightly.${input.date}.${runNumber}`;
}

export function resolveDesktopReleaseMetadata(
  version: string,
): DesktopReleaseMetadata {
  const channel = resolveUpdateChannel(version);
  const productName = resolveProductName(channel);
  const prerelease = channel === 'nightly';

  return {
    version,
    channel,
    productName,
    releaseName:
      channel === 'nightly'
        ? `Bangle.io Nightly ${version}`
        : `Bangle.io v${version}`,
    tag: `v${version}`,
    prerelease,
    makeLatest: !prerelease,
  };
}

export function validateStableTag(input: {
  readonly tag: string;
  readonly packageVersion: string;
}): string {
  const version = input.tag.startsWith('v') ? input.tag.slice(1) : input.tag;

  if (!isStableVersion(version)) {
    throw new Error(`Stable desktop release tags must be vX.Y.Z: ${input.tag}`);
  }

  if (version !== input.packageVersion) {
    throw new Error(
      `Stable desktop release tag ${input.tag} does not match package version ${input.packageVersion}`,
    );
  }

  return version;
}

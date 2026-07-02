const path = require('node:path');

const channel = process.env.BANGLE_DESKTOP_CHANNEL || 'latest';
const packageRoot = __dirname;
const sourcePackageJson = require(path.join(packageRoot, 'package.json'));
const electronVersion = String(
  sourcePackageJson.devDependencies.electron,
).replace(/^[^\d]*/, '');
const version = process.env.BANGLE_RELEASE_VERSION;
const productName =
  process.env.BANGLE_DESKTOP_PRODUCT_NAME ||
  (channel === 'nightly' ? 'Bangle.io Nightly' : 'Bangle.io');
const artifactName =
  '$' + '{productName}-$' + '{version}-$' + '{arch}.$' + '{ext}';
const shouldSign = process.env.BANGLE_DESKTOP_SIGN === 'true';
const shouldNotarize = process.env.BANGLE_DESKTOP_NOTARIZE === 'true';
const isStable = channel === 'latest';

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: isStable ? 'io.bangle.desktop' : 'io.bangle.desktop.nightly',
  electronVersion,
  productName,
  asar: true,
  directories: {
    output: path.join(packageRoot, 'release', channel),
  },
  files: ['dist/**/*', 'package.json'],
  extraResources: [
    {
      from: path.join(packageRoot, '..', 'browser-entry', 'dist'),
      to: 'browser-entry',
      filter: ['**/*'],
    },
  ],
  extraMetadata: {
    ...(version ? { version } : {}),
    dependencies: {},
    productName,
  },
  artifactName,
  publish: [
    {
      provider: 'github',
      owner: 'bangle-io',
      repo: 'bangle-io',
      channel,
    },
  ],
  mac: {
    category: 'public.app-category.productivity',
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    identity: shouldSign ? undefined : null,
    notarize: shouldNotarize,
    target: [
      {
        target: 'dmg',
        arch: ['arm64', 'x64'],
      },
      {
        target: 'zip',
        arch: ['arm64', 'x64'],
      },
    ],
    extendInfo: {
      NSApplicationSupportsSecureRestorableState: true,
    },
  },
  dmg: {
    sign: false,
  },
  forceCodeSigning: isStable,
};

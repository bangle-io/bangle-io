const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// pnpm monorepo: watch the repo root so workspace packages resolve when the
// shell starts importing them (M2+); harmless while there are none.
const workspaceRoot = path.resolve(__dirname, '../../..');
config.watchFolders = [
  ...new Set([...(config.watchFolders ?? []), workspaceRoot]),
];

module.exports = config;

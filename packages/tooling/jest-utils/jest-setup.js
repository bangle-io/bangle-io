const { BangleConfig } = require('@bangle.io/config-template');
const HELP_DOCS_VERSION = require('bangle-io-help/package.json').version;

process.env.__BANGLE_BUILD_TIME_CONFIG__ = new BangleConfig({
  build: {
    appEnv: 'production',
    buildTime: new Date().toISOString(),
    commitHash: 'fake-hash',
    deployBranch: 'local',
    hot: false,
    netlifyBuildContext: process.env.CONTEXT || '',
    nodeEnv: 'test',
    releaseId: 'fake-release-id',
    releaseVersion: 'fake-release-version',
    storybook: false,
  },
  app: {
    changelogText: 'dummy-change-log text',
    helpDocsVersion: HELP_DOCS_VERSION,
  },
}).serialize();

process.on('unhandledRejection', (reason) => {
  console.log(reason); // log the reason including the stack trace
  throw new Error('unhandled error');
});

if (typeof DOMException === 'undefined') {
  // eslint-disable-next-line no-native-reassign
  global.DOMException = require('domexception');
}

console.debug = () => {};

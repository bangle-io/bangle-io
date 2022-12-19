const { BangleConfig } = require('@bangle.io/config-template');

/* eslint-disable no-process-env */
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
    helpDocsVersion: '1.0.0',
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

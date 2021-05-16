/* eslint-disable no-process-env */

let commitHash = require('child_process')
  .execSync('git rev-parse --short HEAD')
  .toString()
  .trim();

const helpDocsVersion = JSON.parse(
  require('child_process')
    .execSync('yarn info bangle-io-help --json -A')
    .toString(),
).children.Version;

module.exports = ({ isProduction }) => {
  return {
    appEnvs: {
      'process.env.NODE_ENV': JSON.stringify(
        isProduction ? 'production' : 'development',
      ),
      'process.env.RELEASE_ID': JSON.stringify(
        process.env.NETLIFY
          ? `${process.env.CONTEXT}@` + process.env.COMMIT_REF
          : 'local@' + commitHash,
      ),
      'process.env.DEPLOY_ENV': JSON.stringify(
        process.env.NETLIFY ? process.env.CONTEXT : 'local',
      ),

      'process.env.HELP_DOCS_VERSION': JSON.stringify(helpDocsVersion),
    },
  };
};

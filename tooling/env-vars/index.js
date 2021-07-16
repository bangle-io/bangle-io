/* eslint-disable no-process-env */
const path = require('path');
const fs = require('fs');
let commitHash = require('child_process')
  .execSync('git rev-parse --short HEAD')
  .toString()
  .trim();

const helpDocsVersion = JSON.parse(
  require('child_process')
    .execSync('yarn info bangle-io-help --json -A')
    .toString(),
).children.Version;

function readChangelogText() {
  return fs.readFileSync(
    path.join(__dirname, '..', '..', 'CHANGELOG.md'),
    'utf-8',
  );
}

module.exports = ({ isProduction, isVite = false }) => {
  return {
    helpDocsVersion,
    htmlInjections: {
      sentry: isProduction
        ? `<script
      src="https://js.sentry-cdn.com/f1a3d53e530e465e8f74f847370b594b.min.js"
      crossorigin="anonymous"
      data-lazy="no"
    ></script>`
        : '',
      bangleHelpPreload: `<link
      rel="preload"
      href="https://unpkg.com/bangle-io-help@${helpDocsVersion}/docs/landing.md"
      as="fetch"
      crossorigin
    />`,
      viteJsEntry: isVite
        ? '<script type="module" src="/app/app-entry/index.js"></script>'
        : '',
    },
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
      'process.env.BANGLE_HOT': JSON.stringify(
        process.env.BANGLE_HOT ? true : false,
      ),
      'process.env.CHANGELOG_TEXT': JSON.stringify(readChangelogText()),
    },
  };
};

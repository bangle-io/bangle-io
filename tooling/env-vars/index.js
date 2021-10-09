/* eslint-disable no-process-env */
const path = require('path');
const fs = require('fs');

const releaseVersion = require('../../package.json').version;

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

/**
 * @returns either `local`, `production`, `staging` or `dev/*` where * is the current branch name
 */
function getAppEnv(isProd) {
  if (!isProd || !process.env.NETLIFY) {
    return 'local';
  }

  // comes from netlify
  switch (process.env.CONTEXT) {
    case 'production': {
      return 'production';
    }

    case 'deploy-preview':
    case 'branch-deploy': {
      const branch = process.env.BRANCH;
      if (branch === 'staging') {
        return 'staging';
      }
      return 'dev/' + branch;
    }

    default: {
      throw new Error('Unknown CONTEXT');
    }
  }
}
function getReleaseId(isProduction) {
  if (!isProduction) {
    return releaseVersion + '#local';
  }

  return releaseVersion + '#' + process.env.BUILD_ID;
}

module.exports = ({ isProduction, isVite = false }) => {
  const appEnv = getAppEnv(isProduction);
  return {
    helpDocsVersion,
    appEnv,
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
        ? '<script type="module" src="/app/app-entry/index.ts"></script>'
        : '',
    },
    appEnvs: {
      'process.env.NODE_ENV': JSON.stringify(
        isProduction ? 'production' : 'development',
      ),
      'process.env.DEPLOY_BRANCH': JSON.stringify(
        isProduction ? process.env.BRANCH : 'local',
      ),
      'process.env.APP_ENV': JSON.stringify(appEnv),
      'process.env.RELEASE_VERSION': JSON.stringify(releaseVersion),
      'process.env.RELEASE_ID': JSON.stringify(getReleaseId(isProduction)),
      'process.env.NETLIFY_BUILD_CONTEXT': JSON.stringify(process.env.CONTEXT),
      'process.env.COMMIT_HASH': JSON.stringify(
        (
          process.env.COMMIT_REF ||
          require('child_process')
            .execSync('git rev-parse --short HEAD')
            .toString()
            .trim()
        ).slice(0, 7),
      ),
      'process.env.HELP_DOCS_VERSION': JSON.stringify(helpDocsVersion),
      'process.env.BANGLE_HOT': JSON.stringify(
        process.env.BANGLE_HOT ? true : false,
      ),
      'process.env.CHANGELOG_TEXT': JSON.stringify(readChangelogText()),
    },
  };
};

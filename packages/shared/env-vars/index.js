/* eslint-disable no-process-env */
const path = require('node:path');
const fs = require('node:fs');
const { BangleConfig } = require('@bangle.io/config-template');

const releaseVersion = require('../../../package.json').version;

function readChangelogText() {
  return fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'CHANGELOG.md'),
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
  const branch = process.env.BRANCH;

  // comes from netlify
  switch (process.env.CONTEXT) {
    case 'production': {
      if (branch === 'production') {
        return 'production';
      }

      return branch;
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

function getFavicon(appEnv) {
  if (appEnv === 'production') {
    return `
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="alternate icon" href="/favicon.ico" type="image/png" sizes="48x48" />
    <link rel="mask-icon" href="/favicon.svg" color="#FFFFFF" />`;
  }
  if (appEnv === 'staging') {
    return `
    <link rel="icon" href="/favicon-staging.svg" type="image/svg+xml" />
    <link rel="alternate icon" href="/favicon-staging.ico" type="image/png" sizes="48x48" />
    <link rel="mask-icon" href="/favicon-staging.svg" color="#00FF29" />`;
  }

  return `
    <link rel="icon" href="/favicon-dev.svg" type="image/svg+xml" />
    <link rel="alternate icon" href="/favicon-dev.ico" type="image/png" sizes="48x48" />
    <link rel="mask-icon" href="/favicon-dev.svg" color="#FFF0F4" />`;
}

module.exports = ({
  isProduction = false,
  isVite = false,
  isStorybook = false,
  helpDocsVersion,
  publicDirPath,
}) => {
  const appEnv = getAppEnv(isProduction);

  const hot = process.env.BANGLE_HOT ? true : false;
  const bangleConfig = new BangleConfig({
    build: {
      appEnv: appEnv,
      buildTime: new Date().toISOString(),
      commitHash: (
        process.env.COMMIT_REF ||
        require('child_process')
          .execSync('git rev-parse --short HEAD')
          .toString()
          .trim()
      ).slice(0, 7),
      deployBranch: (isProduction ? process.env.BRANCH : 'local') || 'local',
      hot,
      netlifyBuildContext: process.env.CONTEXT || '',
      nodeEnv: isProduction ? 'production' : 'development',
      releaseId: getReleaseId(isProduction),
      releaseVersion: releaseVersion,
      storybook: isStorybook,
    },
    app: {
      changelogText: readChangelogText(),
      helpDocsVersion,
    },
  });

  bangleConfig.print();

  const inlinedScripts = fs.readFileSync(
    path.join(publicDirPath, 'auto-generated', 'inline-scripts.global.js'),
    'utf-8',
  );

  return {
    helpDocsVersion,
    appEnv,
    hot,
    htmlInjections: {
      inlinedScripts: `
<script>
${inlinedScripts}
</script>`.trim(),
      favicon: getFavicon(appEnv),
      sentry: isProduction
        ? `<script
      src="https://js.sentry-cdn.com/f1a3d53e530e465e8f74f847370b594b.min.js"
      crossorigin="anonymous"
      data-lazy="no"
    ></script>`
        : '',
      bangleHelpPreload: `<link
        rel="preload"
        href="https://unpkg.com/bangle-io-help@${helpDocsVersion}/docs/getting%20started.md"
        as="fetch"
        crossorigin
      />`,
      viteJsEntry: isVite
        ? '<script type="module" src="index.tsx"></script>'
        : '',
      fathom:
        appEnv === 'production'
          ? `<script defer src="https://cdn.usefathom.com/script.js" data-spa="auto" data-site="AOGIPUKY"></script>`
          : '',
    },
    appEnvs: {
      'process.env.__BANGLE_BUILD_TIME_CONFIG__': JSON.stringify(
        bangleConfig.serialize(),
      ),
    },
  };
};

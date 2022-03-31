/* eslint-disable no-process-env */
const path = require('path');
const fs = require('fs');
const { extractCSSVars } = require('@bangle.io/extract-css-vars');

const releaseVersion = require('../../package.json').version;

const pathToCSSVars = path.resolve(__dirname, '..', 'public', 'main.css');

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

async function getCssVars() {
  let result = [];
  const data = await extractCSSVars(fs.readFileSync(pathToCSSVars, 'utf8'));

  data.forEach(([varName, value]) => {
    result.push(`--${varName}: ${value};`);
  });

  return [`<style>:root {`, ...result, `}</style>`].join('\n');
}

module.exports = async ({ isProduction, isVite = false }) => {
  const appEnv = getAppEnv(isProduction);

  return {
    helpDocsVersion,
    appEnv,
    htmlInjections: {
      cssVars: await getCssVars(),
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
        ? '<script type="module" src="/app/app-entry/index.ts"></script>'
        : '',
      fathom:
        appEnv === 'production'
          ? `<script defer src="https://cdn.usefathom.com/script.js" data-spa="auto" data-site="AOGIPUKY"></script>`
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
      'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
  };
};

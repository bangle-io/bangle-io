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

      return `dev/${branch}`;
    }

    default: {
      throw new Error('Unknown CONTEXT');
    }
  }
}
function getReleaseId(isProduction) {
  if (!isProduction) {
    return `${releaseVersion}#local`;
  }

  return `${releaseVersion}#${process.env.BUILD_ID}`;
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
  inlinedScripts = '',
}) => {
  const appEnv = getAppEnv(isProduction);

  const hot = Boolean(process.env.BANGLE_HOT);
  const bangleConfig = new BangleConfig({
    build: {
      appEnv: appEnv,
      buildTime: new Date().toISOString(),
      commitHash: (
        process.env.GITHUB_SHA ||
        process.env.COMMIT_REF ||
        require('node:child_process')
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
  const goatAnalytics =
    appEnv !== 'production'
      ? ''
      : `
<script>
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  window.goatcounter = {no_onload: true}
  window.addEventListener('hashchange', async function(e) {
      const pathname = location.pathname;
      const searchAndHash = location.search + location.hash;
      let obfuscatedPath = pathname;

      if (searchAndHash) {
          const hashedPart = await sha256(searchAndHash);
          obfuscatedPath += '|' + hashedPart;
      }
      window.goatcounter.count({
          path: obfuscatedPath,
      });
  });
</script>
<script data-goatcounter="https://bangle-io.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>      
`;

  bangleConfig.print();

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
      goatAnalytics,
    },
    globalIdentifiers: {
      __BANGLE_BUILD_TIME_CONFIG__: JSON.stringify(bangleConfig.serialize()),
    },
  };
};

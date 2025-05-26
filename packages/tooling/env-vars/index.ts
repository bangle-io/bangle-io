import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BangleConfig } from '@bangle.io/config-template';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const packageJson = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'package.json'),
    'utf-8',
  ),
);
const releaseVersion: string = packageJson.version;

const IS_CLOUDFLARE_PAGES = process.env.CF_PAGES === '1';
const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === 'true';
const IS_CI_BUILD = IS_CLOUDFLARE_PAGES || IS_GITHUB_ACTIONS;

const GIT_BRANCH = process.env.CF_PAGES_BRANCH || process.env.GITHUB_REF_NAME;
const GIT_COMMIT_SHA =
  process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;

const CI_BUILD_ID = GIT_COMMIT_SHA;

const BANGLE_HOT_ENABLED = process.env.BANGLE_HOT;

function readChangelogText(): string {
  return fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'CHANGELOG.md'),
    'utf-8',
  );
}

/**
 * @returns either `local`, `production`, `staging` or `dev/*` where * is the current branch name
 */
function getAppEnv(isProd: boolean): string {
  if (!isProd || !IS_CI_BUILD) {
    return 'local';
  }

  if (GIT_BRANCH === 'production') {
    return 'production';
  }
  if (GIT_BRANCH === 'staging' || GIT_BRANCH === 'main') {
    return 'staging';
  }

  return `dev/${GIT_BRANCH}`;
}

function getReleaseId(isProduction: boolean): string {
  if (!isProduction) {
    return `${releaseVersion}#local`;
  }
  // In CI (isProduction=true), CI_BUILD_ID should be set.
  return `${releaseVersion}#${CI_BUILD_ID || 'unknown_ci_build'}`;
}

function getFavicon(appEnv: string): string {
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

interface EnvVarsOptions {
  isProduction?: boolean;
  isStorybook?: boolean;
  helpDocsVersion?: string;
  inlinedScripts?: string[];
}

interface HtmlInjections {
  inlinedScripts: string;
  favicon: string;
  goatAnalytics: string;
}

interface GlobalIdentifiers {
  __BANGLE_BUILD_TIME_CONFIG__: string;
}

interface EnvVarsResult {
  helpDocsVersion?: string;
  appEnv: string;
  hot: boolean;
  htmlInjections: HtmlInjections;
  globalIdentifiers: GlobalIdentifiers;
}

export default ({
  isProduction = false,
  isStorybook = false,
  helpDocsVersion,
  inlinedScripts = [],
}: EnvVarsOptions): EnvVarsResult => {
  const appEnv = getAppEnv(isProduction);

  const hot = Boolean(BANGLE_HOT_ENABLED);
  const bangleConfig = new BangleConfig({
    build: {
      appEnv: appEnv,
      buildTime: new Date().toISOString(),
      commitHash: (
        GIT_COMMIT_SHA ||
        execSync('git rev-parse --short HEAD').toString().trim()
      ).slice(0, 7),
      deployBranch: (isProduction ? GIT_BRANCH : 'local') || 'local',
      hot,
      netlifyBuildContext: IS_CLOUDFLARE_PAGES
        ? 'cloudflare_pages'
        : IS_GITHUB_ACTIONS
          ? 'github_actions'
          : 'local',
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
      if (typeof window.goatcounter.count === 'function') {
        window.goatcounter.count({
          path: obfuscatedPath,
        });
      }
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
${inlinedScripts.join(';\n\n')}
</script>`.trim(),
      favicon: getFavicon(appEnv),
      goatAnalytics,
    },
    globalIdentifiers: {
      __BANGLE_BUILD_TIME_CONFIG__: JSON.stringify(bangleConfig.serialize()),
    },
  };
};

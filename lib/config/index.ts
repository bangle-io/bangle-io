let envVars: any = {};
// Done this way to allow for bundlers
// to do a string replace.
try {
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.buildTime = process.env.BUILD_TIME;
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.nodeEnv = process.env.NODE_ENV;
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.releaseId = process.env.RELEASE_ID;
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.deployBranch = process.env.DEPLOY_BRANCH;
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.releaseVersion = process.env.RELEASE_VERSION;
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.appEnv = process.env.APP_ENV;
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.commitHash = process.env.COMMIT_HASH;
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.helpDocsVersion = process.env.HELP_DOCS_VERSION;
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.bangleHot = process.env.BANGLE_HOT;
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.changelogText = process.env.CHANGELOG_TEXT;
  // @ts-ignore process is undefined unless we pull in @types/node
  // eslint-disable-next-line no-process-env
  envVars.netlifyBuildContext = process.env.NETLIFY_BUILD_CONTEXT;
} catch (err) {}
// appEnv can be one of the following only `production`, `staging`,
// `local` , `dev/*` where * is the branch name
export const APP_ENV: string = envVars.appEnv;
export const IS_PRODUCTION_APP_ENV = APP_ENV === 'production';
export const RELEASE_VERSION: string = envVars.releaseVersion;
export const RELEASE_ID: string = envVars.releaseId;
// a less intimidating thing that is shown in the UI
// for production it is release version but for other env we show the whole thing
// for better debugging
export const FRIENDLY_ID = IS_PRODUCTION_APP_ENV ? RELEASE_VERSION : RELEASE_ID;

export const HELP_DOCS_VERSION: string = envVars.helpDocsVersion;
export const TAB_ID: string = 'tab_' + randomStr(4);
export const BANGLE_HOT: string = envVars.bangleHot;
export const CHANGELOG_TEXT: string = envVars.changelogText;

if (envVars.nodeEnv !== 'test') {
  console.log(envVars.appEnv + ': using ' + RELEASE_ID);

  console.table({
    ...envVars,
    tabId: TAB_ID,
    isWorkerContext:
      typeof WorkerGlobalScope !== 'undefined' &&
      // eslint-disable-next-line no-restricted-globals, no-undef
      self instanceof WorkerGlobalScope,
  });
}

if (!/^\d+\.\d+\.\d+/.test(HELP_DOCS_VERSION || '')) {
  throw new Error('Invalid HELP_DOCS_VERSION: ' + HELP_DOCS_VERSION);
}

export const SPLIT_SCREEN_MIN_WIDTH =
  typeof document === 'undefined'
    ? 500
    : parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--window-widescreen-minWidth',
        ),
        10,
      );

export * from './is-mac';
export * from './keybindings';

export const FILE_PALETTE_MAX_RECENT_FILES = 15;
export const FILE_PALETTE_MAX_FILES = 200;
export const SERVICE_WORKER_UPDATE_INTERVAL = IS_PRODUCTION_APP_ENV
  ? 10 * 60 * 1000
  : 20 * 1000;

function randomStr(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

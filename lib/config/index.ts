import { compileConfig } from './compile-config';

export {
  browserInfo,
  isChrome,
  isFirefox,
  isMac,
  isMobile,
  isSafari,
} from './browser';
export const config = compileConfig();
export type { FinalConfig } from '@bangle.io/config-template';

// appEnv can be one of the following only `production`, `staging`,
// `local` , `dev/*` where * is the branch name
export const APP_ENV: string = config.build.appEnv;
export const IS_PRODUCTION_APP_ENV = APP_ENV === 'production';
export const RELEASE_VERSION: string = config.build.releaseVersion;
export const RELEASE_ID: string = config.build.releaseId;
// a less intimidating thing that is shown in the UI
// for production it is release version but for other env we show the whole thing
// for better debugging
export const FRIENDLY_ID = IS_PRODUCTION_APP_ENV ? RELEASE_VERSION : RELEASE_ID;

export const HELP_DOCS_VERSION: string = config.app.helpDocsVersion;
export const TAB_ID: string = 'tab_' + randomStr(4);
export const BANGLE_HOT = config.build.hot;
export const CHANGELOG_TEXT: string = config.app.changelogText;
export const IS_STORYBOOK = config.build.storybook;

export const DEBUG_WRITE_SLOWDOWN = config.debug?.writeSlowDown;
export const IS_TEST_ENV = config.build.nodeEnv === 'test';

export const sentryConfig = {
  environment: APP_ENV,
  dsn: 'https://f1a3d53e530e465e8f74f847370b594b@o573373.ingest.sentry.io/5723848',
  integrations: [],
  release: RELEASE_ID,
  tracesSampleRate:
    APP_ENV === 'production' ? 0.8 : APP_ENV === 'staging' ? 1 : 0,
};

if (config.build.nodeEnv !== 'test') {
  console.log(config.build.appEnv + ': using ' + RELEASE_ID);

  console.table({
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

// WARNING: the width is hard coded at multiple places, search for it
// by value if you want to change it
export const SPLIT_SCREEN_MIN_WIDTH = 759;
export const FILE_PALETTE_MAX_RECENT_FILES = 15;
export const FILE_PALETTE_MAX_FILES = 200;
export const SERVICE_WORKER_UPDATE_INTERVAL = IS_PRODUCTION_APP_ENV
  ? 10 * 60 * 1000
  : 20 * 1000;

function randomStr(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

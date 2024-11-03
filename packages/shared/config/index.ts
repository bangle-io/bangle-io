import { compileConfig } from './compile-config';

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
export const BANGLE_HOT = config.build.hot;
export const CHANGELOG_TEXT: string = config.app.changelogText;
export const IS_STORYBOOK = Boolean(config.build.storybook);
export const DEBUG_WRITE_SLOWDOWN = config.debug?.writeSlowDown;
export const IS_TEST_ENV = config.build.nodeEnv === 'test';
export const IS_WORKER_CONTEXT =
  typeof WorkerGlobalScope !== 'undefined' &&
  // eslint-disable-next-line no-restricted-globals, no-undef
  self instanceof WorkerGlobalScope;

// a unique id for each browser context like a window,  iframe, worker
export const BROWSING_CONTEXT_ID: string = `bCtx_${IS_WORKER_CONTEXT ? 'worker_' : ''}${randomStr(4)}`;

export const sentryConfig = {
  environment: APP_ENV,
  dsn: 'https://c477171ea90a1b9c9880663eab622aa6@o573373.ingest.sentry.io/4506209099382784',
  release: RELEASE_ID,
  tracesSampleRate:
    APP_ENV === 'production' ? 0.8 : APP_ENV === 'staging' ? 1 : 0,
  replaysSessionSampleRate: APP_ENV === 'production' ? 0.1 : 1,
  replaysOnErrorSampleRate: 1.0,
};

if (config.build.nodeEnv !== 'test') {
  console.log(`${config.build.appEnv}: using ${RELEASE_ID}`);

  console.table({
    browserContextId: BROWSING_CONTEXT_ID,
    isWorkerContext:
      typeof WorkerGlobalScope !== 'undefined' &&
      // eslint-disable-next-line no-restricted-globals, no-undef
      self instanceof WorkerGlobalScope,
  });
}

if (!/^\d+\.\d+\.\d+/.test(HELP_DOCS_VERSION || '')) {
  throw new Error(`Invalid HELP_DOCS_VERSION: ${HELP_DOCS_VERSION}`);
}

function randomStr(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

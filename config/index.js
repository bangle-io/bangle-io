let nodeEnv = undefined;
let releaseId = undefined;
let deployEnv = undefined;
let helpDocsVersion = undefined;
// Done this way to allow for bundlers
// to do a string replace.
try {
  // eslint-disable-next-line no-process-env
  nodeEnv = process.env.NODE_ENV;
  // eslint-disable-next-line no-process-env
  releaseId = process.env.RELEASE_ID;
  // eslint-disable-next-line no-process-env
  deployEnv = process.env.DEPLOY_ENV;
  // eslint-disable-next-line no-process-env
  helpDocsVersion = process.env.HELP_DOCS_VERSION;
} catch (err) {}

export const APP_ENV = nodeEnv;
export const RELEASE_ID = releaseId;
export const DEPLOY_ENV = deployEnv;
export const HELP_DOCS_VERSION = helpDocsVersion;

if (!/^\d+\.\d+\.\d+/.test(HELP_DOCS_VERSION)) {
  throw new Error('Invalid HELP_DOCS_VERSION: ' + HELP_DOCS_VERSION);
}

export const config = {
  APP_ENV,
  RELEASE_ID,
  HELP_DOCS_VERSION,
  isTest: nodeEnv === 'test',
  isProduction: nodeEnv === 'production',
  isIntegration: nodeEnv === 'integration',
};

console.debug(config);

export const SPLIT_SCREEN_MIN_WIDTH = parseInt(
  getComputedStyle(document.documentElement).getPropertyValue(
    '--widescreen-min-width',
  ),
  10,
);

export * from './keybindings';
export * from './is-mac';

export const FILE_PALETTE_MAX_RECENT_FILES = 15;
export const FILE_PALETTE_MAX_FILES = 200;

declare var process: {
  env: {
    NODE_ENV: string;
  };
};

let nodeEnv = undefined;

// Done this way to allow for bundlers
// to do a string replace.

try {
  // eslint-disable-next-line no-process-env
  nodeEnv = process.env.NODE_ENV;
} catch (err) {}

export const APP_ENV = nodeEnv;

export const config = {
  APP_ENV,
  isTest: nodeEnv === 'test',
  isProduction: nodeEnv === 'production',
  isIntegration: nodeEnv === 'integration',
};

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

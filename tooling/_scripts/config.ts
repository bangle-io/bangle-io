import path from 'path';

export const ROOT_DIR_PATH = path.resolve(__dirname, '..', '..');
export const ROOT_PACKAGE_PATH = path.join(ROOT_DIR_PATH, 'package.json');
export const PUBLIC_DIR = path.join(ROOT_DIR_PATH, 'tooling', 'public');

export const LIB = 'lib';
export const JS_LIB = 'js-lib';
export const WORKER = 'worker';
export const EXTENSIONS = 'extensions';
export const APP = 'app';
export const TOOLING = 'tooling';

export const ALL_TOP_LEVEL_DIRS = [
  LIB,
  JS_LIB,
  WORKER,
  EXTENSIONS,
  APP,
  TOOLING,
];

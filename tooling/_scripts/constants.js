const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const rootPackagePath = path.join(rootDir, 'package.json');

const LIB = 'lib';
const JS_LIB = 'js-lib';
const WORKER = 'worker';
const EXTENSIONS = 'extensions';
const APP = 'app';
const TOOLING = 'tooling';

module.exports = {
  rootDir,
  rootPackagePath,
  APP,
  EXTENSIONS,
  JS_LIB,
  LIB,
  TOOLING,
  WORKER,
};

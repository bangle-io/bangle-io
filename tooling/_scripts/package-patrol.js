const LIB = 'lib';
const JS_LIB = 'js-lib';
const WORKER = 'worker';
const EXTENSIONS = 'extensions';
const APP = 'app';
// eslint-disable-next-line no-unused-vars
const TOOLING = 'tooling';

const flatten = (array) => array.flatMap((a) => a);
class WorkTree {
  constructor(name) {
    this.name = name;
  }
  packages() {
    return [];
  }
}

const libTree = new WorkTree(LIB);
const jsLibTree = new WorkTree(JS_LIB);
const workerTree = new WorkTree(WORKER);
const appTree = new WorkTree(APP);

const dependencyConstraints = {
  [JS_LIB]: flatten([]),
  [LIB]: flatten([jsLibTree.packages(), libTree.packages()]),
  [WORKER]: flatten([
    jsLibTree.packages(),
    libTree.packages(),
    workerTree.packages(),
  ]),
  [EXTENSIONS]: flatten([
    jsLibTree.packages(),
    libTree.packages(),
    'worker-proxy',
  ]),
  [APP]: flatten([
    jsLibTree.packages(),
    libTree.packages(),
    workerTree.packages(),
    appTree.packages(),
  ]),
};

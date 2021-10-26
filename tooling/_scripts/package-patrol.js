const LIB = 'lib';
const JS_LIB = 'js-lib';
const WORKER = 'worker';
const EXTENSIONS = 'extensions';
const APP = 'app';
const TOOLING = 'tooling';
const {
  walkWorkspace,
  getParentWorktree,
  getWorktreeWorkspaces,
} = require('./map-files');

checkDepConstraints();
checkMultipleInstances();

class WorkTree {
  constructor(name) {
    this.name = name;
  }
  async packages() {
    return (await getWorktreeWorkspaces(this.name)).map((r) => r.name);
  }
}

const libTree = new WorkTree(LIB);
const jsLibTree = new WorkTree(JS_LIB);
const workerTree = new WorkTree(WORKER);
const appTree = new WorkTree(APP);
const toolingTree = new WorkTree(TOOLING);
const extensionTree = new WorkTree(EXTENSIONS);

/**
 * @returns An object where key is the work tree name and value is an array of workspace names that are allowed
 * in by a workspace in the worktree to depend on.
 */
const getDepConstraints = async () => {
  const obj = {
    [JS_LIB]: [jsLibTree.packages()],
    [LIB]: [jsLibTree.packages(), libTree.packages()],
    [WORKER]: [jsLibTree.packages(), libTree.packages(), workerTree.packages()],
    [EXTENSIONS]: [
      jsLibTree.packages(),
      libTree.packages(),
      '@bangle.io/naukar-proxy',
    ],
    [APP]: [
      jsLibTree.packages(),
      libTree.packages(),
      workerTree.packages(),
      extensionTree.packages(),
      appTree.packages(),
    ],
    [TOOLING]: [
      jsLibTree.packages(),
      libTree.packages(),
      workerTree.packages(),
      extensionTree.packages(),
      appTree.packages(),
      toolingTree.packages(),
    ],
  };

  const flatten = Object.entries(obj).map(async ([worktree, dependencies]) => {
    return [worktree, (await Promise.all(dependencies)).flatMap((r) => r)];
  });

  return Object.fromEntries(await Promise.all(flatten));
};

async function checkDepConstraints() {
  const workspaces = await walkWorkspace();
  const depConstraints = await getDepConstraints();
  for (const w of workspaces) {
    if (w.isWorktree) {
      continue;
    }
    const parentWorktree = await getParentWorktree(w.name);
    const allowedDeps = depConstraints[parentWorktree.name];
    const actualDeps = w.workspaceDeps;
    const outsideDep = actualDeps.find((r) => !allowedDeps.includes(r));
    if (outsideDep) {
      throw new Error(`${outsideDep} is not allowed for ${w.name}`);
    }
  }
  console.log('checkDepConstraints found no issues');
}

function checkMultipleInstances() {
  const output = require('child_process')
    .execSync(`yarn info --virtuals --all --json `)
    .toString()
    .split('\n')
    .filter(Boolean)
    .map((r) => JSON.parse(r))
    .filter(
      (r) =>
        r.value.startsWith('@bangle.dev/') ||
        r.value.startsWith('prosemirror-') ||
        r.value.startsWith('react-router-dom@') ||
        r.value.startsWith('react@') ||
        r.value.startsWith('react-dom@'),
    );

  const faultyDeps = output.filter((r) => r.children.Instances > 1);
  if (faultyDeps.length > 0) {
    console.log('\nPackages with more than one instances');
    console.log(
      faultyDeps
        .map((r) => `  name=${r.value} count=${r.children.Instances}`)
        .join('\n'),
    );
    console.log('\n');
    throw new Error(
      'One or more packages have multiple instances. Please read CONTRIBUTING.md for more info',
    );
  } else {
    console.log('checkMultipleInstances found no issues');
  }
}

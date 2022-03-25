const { walkWorkspace, getParentWorktree } = require('./lib/map-files');
const { WorkTree } = require('./lib/work-tree');
const { yarnGetVirtuals } = require('./lib/yarn-utils');
const {
  LIB,
  JS_LIB,
  WORKER,
  APP,
  TOOLING,
  EXTENSIONS,
} = require('./constants');

checkDepConstraints();
checkMultipleInstances();

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
    [JS_LIB]: [jsLibTree.getPackageNames()],
    [LIB]: [jsLibTree.getPackageNames(), libTree.getPackageNames()],
    [WORKER]: [
      jsLibTree.getPackageNames(),
      libTree.getPackageNames(),
      workerTree.getPackageNames(),
    ],
    [EXTENSIONS]: [
      jsLibTree.getPackageNames(),
      libTree.getPackageNames(),
      '@bangle.io/worker-naukar-proxy',
    ],
    [APP]: [
      jsLibTree.getPackageNames(),
      libTree.getPackageNames(),
      workerTree.getPackageNames(),
      extensionTree.getPackageNames(),
      appTree.getPackageNames(),
    ],
    [TOOLING]: [
      jsLibTree.getPackageNames(),
      libTree.getPackageNames(),
      workerTree.getPackageNames(),
      extensionTree.getPackageNames(),
      appTree.getPackageNames(),
      toolingTree.getPackageNames(),
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
  const output = yarnGetVirtuals().filter(
    (r) =>
      r.value.startsWith('@bangle.io/') ||
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

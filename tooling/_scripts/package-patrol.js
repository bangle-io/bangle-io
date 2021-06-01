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
    [EXTENSIONS]: [jsLibTree.packages(), libTree.packages(), 'naukar-proxy'],
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
}

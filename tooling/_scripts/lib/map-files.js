const { rootDir } = require('../constants');
const fs = require('fs/promises');
const path = require('path');

const ROOT_PKG_NAME = 'bangle-io';

module.exports = {
  walkWorkspace,
  walk,
  getWorktrees,
  getWorktreeWorkspaces,
  getParentWorktree,
};

const yarnWorkspacesListOutput = require('child_process')
  .execSync(`yarn workspaces list --json`)
  .toString()
  .split('\n')
  .filter(Boolean);

async function walk(dir, { ignore }) {
  let results = [];
  const list = await fs.readdir(dir);
  for (const item of list) {
    const newPath = path.join(dir, item);
    const stat = await fs.stat(newPath);

    if (ignore({ path: newPath, stat })) {
      continue;
    }
    if (stat.isDirectory()) {
      results = results.concat(await walk(newPath, { ignore }));
    } else {
      results.push(newPath);
    }
  }

  return results;
}

async function getWorktreeWorkspaces(worktreeName) {
  const workspaces = await walkWorkspace();
  const worktree = (await getWorktrees()).find((w) => w.name === worktreeName);

  if (!worktree) {
    throw new Error(`Cannot find worktree ${worktreeName} .`);
  }

  const worktreePath = worktree.path + '/';

  return workspaces.filter((w) => {
    return w.path.startsWith(worktreePath);
  });
}
async function getWorktrees() {
  const workspaces = await walkWorkspace();

  return workspaces.filter((w) => {
    if (w.name !== ROOT_PKG_NAME && Array.isArray(w.packageJSON.workspaces)) {
      return true;
    }

    return false;
  });
}
async function getParentWorktree(workspaceName) {
  const worktrees = await getWorktrees();
  for (const worktree of worktrees) {
    const workspaces = await getWorktreeWorkspaces(worktree.name);

    if (workspaces.find((w) => w.name === workspaceName)) {
      return worktree;
    }
  }
  throw new Error('cannot find parent worktree for ' + workspaceName);
}
async function walkWorkspace({ skipRootWorkspace = true } = {}) {
  const rootPath = rootDir;
  let result = await Promise.all(
    yarnWorkspacesListOutput
      .map((r) => JSON.parse(r))
      .map(async (r) => {
        const _path = path.resolve(rootPath, r.location);

        const packageJSON = JSON.parse(
          await fs.readFile(path.join(_path, 'package.json'), 'utf-8'),
        );

        const topLevelItems = await fs.readdir(_path);

        const items = await Promise.all(
          topLevelItems.map(async (item) => {
            const newPath = path.join(_path, item);
            const stat = await fs.stat(newPath);

            return {
              isDirectory: stat.isDirectory(),
              isFile: stat.isFile(),
              name: item,
              path: newPath,
            };
          }),
        );

        const obj = {
          ...r,
          packageJSON,
          workspaceDeps: Object.entries(packageJSON.dependencies || {})
            .filter(([name, value]) => {
              return value.startsWith('workspace:');
            })
            .map((r) => r[0]),
          workspaceDevDeps: Object.entries(packageJSON.devDependencies || {})
            .filter(([name, value]) => {
              return value.startsWith('workspace:');
            })
            .map((r) => r[0]),
          modifyPackageJSON: async (cb) => {
            const newJSON = await cb(packageJSON, obj);
            await fs.writeFile(
              path.join(_path, 'package.json'),
              JSON.stringify(newJSON, null, 2),
              'utf-8',
            );
          },
          isWorktree: Array.isArray(packageJSON.workspaces),
          rootPath,
          path: _path,
          topFiles: items.filter((i) => i.isFile).map((r) => r.name),
          topDirectories: items.filter((i) => i.isDirectory).map((r) => r.name),
        };

        return obj;
      }),
  );

  return result.filter((r) => {
    if (skipRootWorkspace) {
      return r.name !== ROOT_PKG_NAME;
    }

    return r;
  });
}

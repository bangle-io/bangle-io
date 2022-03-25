const globby = require('globby');
const { getWorktreeWorkspaces } = require('./map-files');
const { yarnWorkspacesList } = require('./yarn-utils');
const { rootDir } = require('../constants');

class WorkTree {
  constructor(name) {
    this.name = name;
  }

  async getAllFiles(workspaceName) {
    const files = await this.packages();
    console.log(files);
    const workspace = files.find((r) => r.name === workspaceName);

    if (workspace) {
      console.log(`${rootDir}/${workspace.location}/**`);

      return globby.sync(`${rootDir}/${workspace.location}/**`);
    }

    return [];
  }

  /**
   * @param {*} param0
   * @returns {Promise<string[]>}
   */
  async getPackageNames() {
    return (await getWorktreeWorkspaces(this.name)).map((r) => r.name);
  }

  /**
   * @param {*} param0
   * @returns {Promise<Package[]>}
   */
  async packages({} = {}) {
    const currentPackages = (await getWorktreeWorkspaces(this.name)).map(
      (r) => r.name,
    );

    return yarnWorkspacesList()
      .filter((r) => {
        return currentPackages.includes(r.name);
      })
      .map((r) => {
        return new Package(r);
      });

    return currentPackages;
  }
}

let r = {
  location: 'tooling/env-vars',
  name: '@bangle.io/env-vars',
  workspaceDependencies: ['lib/constants', 'lib/shared-types'],
  mismatchedWorkspaceDependencies: [],
};

class Package {
  allFilesCache = undefined;

  constructor({
    name,
    location,
    workspaceDependencies,
    mismatchedWorkspaceDependencies,
  }) {
    this.name = name;
    this.location = location;
    this.workspaceDependencies = workspaceDependencies;
    this.mismatchedWorkspaceDependencies = mismatchedWorkspaceDependencies;
  }

  async getAllFiles() {
    if (this.allFilesCache) {
      return this.allFilesCache;
    }

    this.allFilesCache = globby.sync(`${rootDir}/${this.location}/**`);

    return this.allFilesCache;
  }

  async getCssFiles() {
    return (await this.getAllFiles()).filter((r) => r.endsWith('.css'));
  }

  async getTsFiles() {
    return (await this.getAllFiles()).filter(
      (r) => r.endsWith('.ts') || r.endsWith('.tsx'),
    );
  }
}
module.exports = { WorkTree };

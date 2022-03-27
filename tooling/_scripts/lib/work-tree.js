const globby = require('globby');
const { getWorktreeWorkspaces } = require('./map-files');
const { yarnWorkspacesList } = require('./yarn-utils');
const { rootDir, ALL_TREES } = require('../constants');
const { readFile, writeFile } = require('fs/promises');

class WorkTree {
  constructor(name) {
    this.name = name;
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
  }
}

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

  /**
   *
   * @returns {Promise<FileWrapper[]>}
   */
  async getAllFiles() {
    if (this.allFilesCache) {
      return this.allFilesCache;
    }

    const filePaths = globby.sync(`${rootDir}/${this.location}/**`);

    this.allFilesCache = filePaths.map((r) => new FileWrapper(r));

    return this.getAllFiles();
  }

  async getCSSFiles() {
    return (await this.getAllFiles()).filter((r) => {
      return r.isCSS();
    });
  }

  async getTSFiles() {
    return (await this.getAllFiles()).filter((r) => r.isTS());
  }
}

class FileWrapper {
  /** string */
  filePath;
  /**
   *
   * @param {string} filePath
   */
  constructor(filePath) {
    this.filePath = filePath;
  }

  isCSS() {
    return this.filePath.endsWith('.css');
  }

  isTS() {
    return this.filePath.endsWith('.ts') || this.filePath.endsWith('.tsx');
  }

  /**
   *
   * @returns {Promise<string>}
   */
  async readFile() {
    return readFile(this.filePath, 'utf8');
  }

  /**
   * Given a string, replace the contents of the file.
   *
   * @param {(fn:string) => string} fn
   */
  async transformFile(fn) {
    const content = await this.readFile();
    const transformed = fn(content);

    await writeFile(this.filePath, transformed, 'utf8');
  }
}

/**
 *
 * @returns {Promise<Package[]>}
 */
async function getAllPackages() {
  return (
    await Promise.all(
      ALL_TREES.map((r) => new WorkTree(r)).map((r) => {
        return r.packages();
      }),
    )
  ).flatMap((r) => r);
}

module.exports = { WorkTree, getAllPackages, FileWrapper };

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
  async getAllTextFiles() {
    if (this.allFilesCache) {
      return this.allFilesCache;
    }

    const filePaths = globby
      .sync(`${rootDir}/${this.location}/**`)
      .filter(
        (r) =>
          r.endsWith('.json') ||
          r.endsWith('.js') ||
          r.endsWith('.ts') ||
          r.endsWith('.tsx') ||
          r.endsWith('.jsx') ||
          r.endsWith('.snap') ||
          r.endsWith('.css'),
      );

    this.allFilesCache = filePaths.map((r) => new FileWrapper(r));

    return this.getAllTextFiles();
  }

  async getCSSFiles() {
    return (await this.getAllTextFiles()).filter((r) => {
      return r.isCSS();
    });
  }

  async getTSFiles() {
    return (await this.getAllTextFiles()).filter((r) => r.isTS());
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
 * @returns {Promise<FileWrapper[]>}
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

/**
 *
 * @returns {Promise<FileWrapper[]>}
 */
async function getAllTextFiles() {
  const packages = await getAllPackages();

  let result = new Map();
  for (const pkg of packages) {
    for (const file of await pkg.getAllTextFiles()) {
      result.set(file.filePath, file);
    }
  }

  return Array.from(result.values());
}

module.exports = { WorkTree, getAllPackages, getAllTextFiles, FileWrapper };

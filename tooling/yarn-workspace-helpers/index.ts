import execa from 'execa';
import * as fs from 'fs';
import fsProm from 'fs/promises';
import path from 'path';

import { ALL_TOP_LEVEL_DIRS } from './constants';

export { ALL_TOP_LEVEL_DIRS } from './constants';

// The values must match the directory name
export enum PackageType {
  // only the root package.json has this type
  root = '.',
  app = 'app',
  extensions = 'extensions',
  jsLib = 'js-lib',
  lib = 'lib',
  tooling = 'tooling',
  worker = 'worker',
}

const topLevelDirsObj: Record<PackageType, null> = {
  [PackageType.lib]: null,
  [PackageType.jsLib]: null,
  [PackageType.worker]: null,
  [PackageType.extensions]: null,
  [PackageType.app]: null,
  [PackageType.tooling]: null,
  [PackageType.root]: null,
};

export const topLevelDirs = Object.keys(topLevelDirsObj)
  .filter((r) => r !== '.')
  .sort();

ensureConsistentTopDirs();
function ensureConsistentTopDirs() {
  const stringifiedTopLevelDirs2 = JSON.stringify(
    [...ALL_TOP_LEVEL_DIRS].sort(),
  );

  if (stringifiedTopLevelDirs2 !== JSON.stringify(topLevelDirs)) {
    console.log('===========The following must be equal===========');
    console.log(stringifiedTopLevelDirs2);
    console.log(JSON.stringify(topLevelDirs));
    console.log('=================================================');

    // This exists to make sure the directories remain in sync.
    // Please update the list of directories in constants.ts
    throw new Error('topLevelDirs and ALL_TOP_LEVEL_DIRS do not match');
  }
}

interface PackageJSON {
  name: string;
  version: string;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  description?: string;
}

const ignoreCallback = ({ path }: { path: string }) =>
  path.includes('/node_modules/') ||
  path.includes('/.git/') ||
  path.includes('/dist/') ||
  path.includes('/build/') ||
  path.includes('/coverage/') ||
  path.includes('/.yarn/');

export class YarnWorkspaceHelpers {
  packages = new Map<string, Package>();

  constructor(private _opts: { rootDir: string }) {
    this.readWorkspaces();
  }

  async forEachPackage(
    cb: (pkg: Package) => Promise<void>,
    { ignoreWorkTree = true }: { ignoreWorkTree?: boolean } = {},
  ) {
    for (const pkg of this.packages.values()) {
      if (ignoreWorkTree && pkg.isWorktree) {
        continue;
      }

      await cb(pkg);
    }
  }

  getPackage(name: string) {
    return this.packages.get(name);
  }

  async modifyPackageJSON(
    pkgName: string,
    cb: (pkgJSON: PackageJSON, pkg: Package) => PackageJSON,
  ) {
    const pkg = this.packages.get(pkgName);

    if (!pkg) {
      throw new Error(`Could not find package ${pkgName}`);
    }

    const newPkg = await pkg.modifyPackageJSON(cb);

    this.packages.set(pkgName, newPkg);
  }

  *packageIterator({ ignoreWorkTree = true }: { ignoreWorkTree?: boolean }) {
    for (const pkg of this.packages.values()) {
      if (ignoreWorkTree && pkg.isWorktree) {
        continue;
      }
      yield pkg;
    }
  }

  readWorkspaces() {
    const rawData = new Map<
      string,
      { location: string; name: string; workspaceDependencies: string[] }
    >(
      require('child_process')
        .execSync(`yarn workspaces list --verbose --json`)
        .toString()
        .split('\n')
        .filter(Boolean)
        .map((r: any) => JSON.parse(r))
        .map((r: any) => [r.name, r]),
    );

    this.packages.clear();

    for (const r of rawData.values()) {
      let pkgType = getPackageType(r);

      this.packages.set(
        r.name,
        new Package({
          location: r.location,
          name: r.name,
          rootDir: this._opts.rootDir,
          type: pkgType,
        }),
      );
    }

    for (const r of rawData.values()) {
      const pkg = this.packages.get(r.name);
      for (const dep of r.workspaceDependencies) {
        const match = [...this.packages.values()].find(
          (p) => p.location === dep,
        );

        if (match) {
          pkg?.addWsDependency(match);
        } else {
          throw new Error(`Could not find package for ${dep} in ${r.name}`);
        }
      }
    }
  }
}

export function findMatchByLine({
  filePath,
  content,
  match,
}: {
  filePath: string;
  content: string;
  match: RegExp | string | string[];
}): string[] | undefined {
  const result = content
    .split('\n')
    .map((line, index) => {
      if (
        match instanceof RegExp
          ? match.test(line)
          : Array.isArray(match)
          ? match.some((m) => line.includes(m))
          : line.includes(match)
      ) {
        return filePath + ':' + (index + 1);
      }

      return undefined;
    })
    .filter((r): r is string => Boolean(r));

  if (result.length === 0) {
    return undefined;
  }

  return result;
}

export class Package {
  packageJSON: PackageJSON;
  name: string;
  workspaceDependencies = new Map<string, Package>();
  workspaceDevDependencies = new Map<string, Package>();
  packagePath: string;
  dirs: Promise<string[]>;
  type: PackageType = this.opts.type;

  fileHelpersPromise: Promise<Map<string, FileHelper>>;

  constructor(
    public opts: {
      rootDir: string;
      name: string;
      location: string;
      type: PackageType;
    },
  ) {
    this.name = opts.name;

    this.packagePath = path.resolve(opts.rootDir, opts.location);
    this.packageJSON = JSON.parse(
      fs.readFileSync(this.packagePath + '/package.json', 'utf-8'),
    );

    const filesProm = walk(this.packagePath, {
      ignore: ignoreCallback,
    });

    this.fileHelpersPromise = filesProm.then((files) => {
      const map = new Map<string, FileHelper>();

      for (const file of files) {
        map.set(file, new FileHelper(file));
      }

      return map;
    });

    this.dirs = getDirs(this.packagePath, {
      ignore: ignoreCallback,
    });
  }

  get dependencies() {
    return this.packageJSON.dependencies || {};
  }

  get devDependencies() {
    return this.packageJSON.devDependencies;
  }

  get isNotWorktree(): boolean {
    return !this.isWorktree;
  }

  get isToolingWorkspace(): boolean {
    return this.type === PackageType.tooling && !this.isWorktree;
  }

  get isWorktree() {
    return Array.isArray(this.packageJSON.workspaces);
  }

  get location() {
    return this.opts.location;
  }

  addWsDependency(pkg: Package) {
    const { dependencies, devDependencies } = this;

    if (dependencies && dependencies[pkg.name]) {
      this.workspaceDependencies.set(pkg.name, pkg);
    } else if (devDependencies && devDependencies[pkg.name]) {
      this.workspaceDevDependencies.set(pkg.name, pkg);
    } else {
      throw new Error(`Could not find dependency ${pkg.name} in ${this.name}`);
    }
  }

  async forEachFile(
    cb: (opts: {
      filePath: string;
      content: string;
      pkg: Package;
      fileHelper: FileHelper;
    }) => void | Promise<void>,
    filter: (fileHelper: FileHelper) => Promise<boolean> = async () => true,
  ) {
    await this.modifyFiles(async (opts) => {
      await cb(opts);

      return opts.content;
    }, filter);
  }

  async getAllFilePaths(): Promise<string[]> {
    return Array.from((await this.fileHelpersPromise).keys());
  }

  /**
   *
   * @returns true if pkg has one or more css files
   */
  async getCssFileNames(): Promise<string[]> {
    return (await this.getAllFilePaths())
      .map((filePath) => (filePath.endsWith('.css') ? filePath : undefined))
      .filter((r): r is string => Boolean(r));
  }

  async getFileHelper(fileName: string) {
    const fileHelpers = await this.fileHelpersPromise;

    return fileHelpers.get(fileName);
  }

  /**
   *
   * @returns true if pkg has one or more css files
   */
  async hasCSSFiles(): Promise<boolean> {
    return (await this.getCssFileNames()).length > 0;
  }

  async modifyFiles(
    cb: (opts: {
      filePath: string;
      content: string;
      pkg: Package;
      fileHelper: FileHelper;
    }) => string | Promise<string>,
    filter: (fileHelper: FileHelper) => Promise<boolean> = async () => true,
  ) {
    const fileHelpers = await this.fileHelpersPromise;

    for (const [filePath, fileHelper] of fileHelpers.entries()) {
      if (!(await filter(fileHelper))) {
        continue;
      }

      const result = await fileHelper.modify((content) =>
        cb({ filePath, content, pkg: this, fileHelper }),
      );
      fileHelpers.set(filePath, result);
    }
  }

  async modifyPackageJSON(
    cb: (pkgJSON: PackageJSON, pkg: Package) => PackageJSON,
  ): Promise<Package> {
    const newJSON = await cb(this.packageJSON, this);
    await fsProm.writeFile(
      path.join(this.packagePath + '/package.json'),
      JSON.stringify(newJSON, null, 2),
      'utf-8',
    );

    return new Package(this.opts);
  }

  async runWorkspaceCommand(...cmd: string[]) {
    await execa('yarn', ['workspace', this.name, ...cmd], {
      stdio: 'inherit',
    });
  }

  async toJSON() {
    return {
      name: this.name,
      location: this.location,
      type: this.type,
      isWorktree: this.isWorktree,
      hasCSSFiles: await this.hasCSSFiles(),
      isToolingWorkspace: this.isToolingWorkspace,
    };
  }
}

async function walk(
  dir: string,
  { ignore }: { ignore?: (cb: { path: string; stat: any }) => boolean },
) {
  let results: string[] = [];
  const list = await fsProm.readdir(dir);
  for (const item of list) {
    const newPath = path.join(dir, item);
    const stat = await fsProm.stat(newPath);

    if (ignore?.({ path: newPath, stat })) {
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

async function getDirs(
  dir: string,
  { ignore }: { ignore?: (cb: { path: string; stat: any }) => boolean },
) {
  let results: string[] = [];
  const list = await fsProm.readdir(dir);
  for (const item of list) {
    const newPath = path.join(dir, item);
    const stat = await fsProm.stat(newPath);

    if (ignore?.({ path: newPath, stat })) {
      continue;
    }

    if (stat.isDirectory()) {
      results.push(newPath);
      results = results.concat(await getDirs(newPath, { ignore }));
    }
  }

  return results;
}

class FileHelper {
  contentCache: string | undefined;

  constructor(public filePath: string) {}

  get isCSSFile() {
    return this.filePath.endsWith('.css');
  }

  get isE2ETestFile() {
    return this.filePath.includes('.spec.');
  }

  get isJSFile() {
    return this.filePath.endsWith('.js') || this.filePath.endsWith('.jsx');
  }

  get isJSONFile() {
    return this.filePath.endsWith('.json');
  }

  get isSrcFile() {
    return !this.isTestFile;
  }

  get isTestFile() {
    return (
      this.filePath.includes('.test.') ||
      this.filePath.includes('.spec.') ||
      this.filePath.includes('.network-test.')
    );
  }

  get isTSFile() {
    return this.filePath.endsWith('.ts') || this.filePath.endsWith('.tsx');
  }

  get isUnitTestFile() {
    return (
      this.filePath.includes('.test.') ||
      this.filePath.includes('.network-test.')
    );
  }

  async hasText(match: string | RegExp) {
    const content = await this.readCached();

    return match instanceof RegExp
      ? match.test(content)
      : content.includes(match);
  }

  async modify(cb: (content: string) => string | Promise<string>) {
    const content = await this.read();

    const newContent = await cb(content);

    if (content !== newContent) {
      await fsProm.writeFile(this.filePath, newContent, 'utf-8');

      return new FileHelper(this.filePath);
    }

    return this;
  }

  async read() {
    const res = await fsProm.readFile(this.filePath, 'utf-8');

    this.contentCache = res;

    return res;
  }

  async readCached() {
    if (!this.contentCache) {
      return this.read();
    }

    return this.contentCache;
  }
}

function getPackageType<R extends { name: string; location: string }>(
  r: R,
): PackageType {
  let pkgType: PackageType | undefined;

  if (
    r.location === PackageType.app ||
    r.location.startsWith(PackageType.app + '/')
  ) {
    pkgType = PackageType.app;
  } else if (
    r.location === PackageType.extensions ||
    r.location.startsWith(PackageType.extensions + '/')
  ) {
    pkgType = PackageType.extensions;
  } else if (
    r.location === PackageType.jsLib ||
    r.location.startsWith(PackageType.jsLib + '/')
  ) {
    pkgType = PackageType.jsLib;
  } else if (
    r.location === PackageType.lib ||
    r.location.startsWith(PackageType.lib + '/')
  ) {
    pkgType = PackageType.lib;
  } else if (
    r.location === PackageType.tooling ||
    r.location.startsWith(PackageType.tooling + '/')
  ) {
    pkgType = PackageType.tooling;
  } else if (
    r.location === PackageType.worker ||
    r.location.startsWith(PackageType.worker + '/')
  ) {
    pkgType = PackageType.worker;
  } else if (r.location === PackageType.root) {
    pkgType = PackageType.root;
  }

  if (!pkgType) {
    throw new Error(`Could not find package type for ${r.name}`);
  }

  return pkgType;
}

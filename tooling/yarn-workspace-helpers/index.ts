const fs = require('fs');
const path = require('path');
const fsProm = require('fs/promises');
const execa = require('execa');

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
      this.packages.set(
        r.name,
        new Package({
          location: r.location,
          name: r.name,
          rootDir: this._opts.rootDir,
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

class Package {
  packageJSON: PackageJSON;
  name: string;
  workspaceDependencies = new Map<string, Package>();
  workspaceDevDependencies = new Map<string, Package>();
  packagePath: string;
  dirs: Promise<string[]>;

  fileHelpersPromise: Promise<Map<string, FileHelper>>;

  constructor(
    public opts: {
      rootDir: string;
      name: string;
      location: string;
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
    return this.packageJSON.dependencies;
  }

  get devDependencies() {
    return this.packageJSON.devDependencies;
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
    await fs.writeFile(
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

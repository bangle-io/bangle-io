import fsProm from 'node:fs/promises';
import path from 'node:path';

import {
  type BanglePackageConfig,
  type BangleWorkspaceConfig,
  ROOT_PKG_NAME,
  banglePackageConfigSchema,
  bangleWorkspaceConfigSchema,
} from '../config';
import { findAllExportedPaths } from './find-all-exported-paths';
import { findAllImportedPackages } from './find-all-imported-paths';

const root = path.resolve(__dirname, '../../../..');

type WorkspaceData = {
  name: string;
  path: string;
  packageJSON: Record<string, any>;
  bangleWorkspaceConfig: BangleWorkspaceConfig;
};

const globbyIgnore = ['**/node_modules/**', '**/dist/**', '**/build/**'];

export class Workspace {
  get name() {
    return this.data.name;
  }

  get path() {
    return this.data.path;
  }

  private _packagesName: string[] = [];

  get packagesName(): readonly string[] {
    return this._packagesName;
  }

  get packageJSON() {
    return this.data.packageJSON;
  }

  get bangleWorkspaceConfig() {
    return this.data.bangleWorkspaceConfig;
  }

  allowedWsDependency(workspaces: Workspace[], packageName: string): boolean {
    if (this.bangleWorkspaceConfig.allowedWorkspaces.includes('*')) {
      return true;
    }

    for (const wsName of this.bangleWorkspaceConfig.allowedWorkspaces) {
      const wsMatch = workspaces.find((ws) => ws.name === wsName);

      if (!wsMatch) {
        throw new Error(
          `Could not find workspace ${wsName} in workspace ${this.name}`,
        );
      }

      if (wsMatch.packagesName.includes(packageName)) {
        return true;
      }
    }

    return false;
  }

  addPackageName(packageName: string) {
    this._packagesName.push(packageName);
  }

  constructor(private data: WorkspaceData) {}
}

interface PackageState {
  location: string;
  packageJSON: PackageJSON;
  files: string[];
  workspace: Workspace;
  banglePackageConfig: BanglePackageConfig;
}

interface PackageJSON {
  name: string;
  version: string;
  scripts?: Record<string, string>;
  repository?: Record<string, any>;
  author?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  description?: string;
  bangleWorkspaceConfig?: BangleWorkspaceConfig;
  banglePackageConfig?: BanglePackageConfig;
}

export type SetupResult = {
  packagesMap: Map<string, Package>;
  workspaces: Record<string, Workspace>;
};

export async function setup({
  validatePackageConfig = true,
}: { validatePackageConfig?: boolean } = {}): Promise<SetupResult> {
  const { globbySync } = await import('globby');
  const packages = globbySync('**/package.json', {
    cwd: path.join(root, 'packages'),
    absolute: true,
    gitignore: true,
    ignore: globbyIgnore,
  });

  const packagesResolved = packages.map((p) => ({
    path: p,
    packageJSON: require(p),
  }));
  const workspaces: Record<string, Workspace> = Object.fromEntries(
    packagesResolved
      .filter((p) => {
        return p.packageJSON.bangleWorkspaceConfig;
      })
      .map((p): [string, Workspace] => {
        const config = p.packageJSON.bangleWorkspaceConfig;

        // validate config
        bangleWorkspaceConfigSchema.parse(config);

        return [
          p.packageJSON.name,
          new Workspace({
            name: p.packageJSON.name,
            path: p.path,
            packageJSON: p.packageJSON,
            bangleWorkspaceConfig: p.packageJSON.bangleWorkspaceConfig,
          }),
        ];
      }),
  );

  const packageStateMap = Object.fromEntries(
    packagesResolved
      .filter((p) => {
        const banglePackageConfig = p.packageJSON.banglePackageConfig as
          | BanglePackageConfig
          | undefined;
        if (banglePackageConfig?.skipValidation) {
          return false;
        }

        return (
          !p.packageJSON.bangleWorkspaceConfig &&
          p.packageJSON.name !== ROOT_PKG_NAME
        );
      })
      .map((p): [string, PackageState] => {
        const parentDir = path.basename(
          path.dirname(path.resolve(p.path, '..')),
        );

        const workspace = workspaces[parentDir];

        if (!workspace) {
          throw new Error(
            `Could not find workspace for "${p.packageJSON.name}" in "${parentDir}"`,
          );
        }
        workspace.addPackageName(p.packageJSON.name);

        const banglePackageConfig = p.packageJSON.banglePackageConfig;

        if (validatePackageConfig) {
          try {
            banglePackageConfigSchema.parse(banglePackageConfig);
          } catch (err) {
            console.error(err);
            throw new Error(
              `Validation error in package ${p.packageJSON.name} at ${p.path}`,
            );
          }
        }

        const packageObj: PackageState = {
          location: path.dirname(p.path),
          workspace: workspace,
          packageJSON: p.packageJSON,
          banglePackageConfig: banglePackageConfig,
          files: globbySync('**/*', {
            cwd: path.dirname(p.path),
            gitignore: true,
            absolute: true,
            ignore: globbyIgnore,
          }),
        };

        return [p.packageJSON.name, packageObj];
      }),
  );

  const packagesMap = new Map<string, Package>();

  for (const [, pkg] of Object.entries(packageStateMap)) {
    new Package(pkg, packagesMap);
  }

  return {
    packagesMap,
    workspaces,
  };
}

export class Package {
  readonly name: string;
  readonly packagePath: string;

  get packageJSON() {
    return this.packageState.packageJSON;
  }

  get env() {
    return this.banglePackageConfig.env;
  }

  get workspaceDependencies(): Record<string, Package> {
    return this._getWsDeps('dependencies');
  }

  get workspaceDevDependencies(): Record<string, Package> {
    return this._getWsDeps('devDependencies');
  }

  private fileHelpers!: Map<string, FileHelper>;

  get banglePackageConfig() {
    return this.packageState.banglePackageConfig;
  }

  get packageJSONPath() {
    return path.join(this.packagePath, 'package.json');
  }

  get workspace(): Workspace {
    return this.packageState.workspace;
  }

  constructor(
    private packageState: PackageState,
    private packageMapping: Map<string, Package>,
  ) {
    if (packageState.packageJSON.bangleWorkspaceConfig) {
      throw new Error(
        `Not allowed: Package ${packageState.packageJSON.name} is a workspace`,
      );
    }

    this.name = packageState.packageJSON.name;
    this.packagePath = packageState.location;

    this._compute();
  }

  private _compute() {
    this.packageMapping.set(this.name, this);
    if (this.fileHelpers) {
      this.fileHelpers.clear();
    } else {
      this.fileHelpers = new Map<string, FileHelper>();
    }

    for (const file of this.packageState.files) {
      this.fileHelpers.set(file, new FileHelper(file));
    }
  }

  private _getWsDeps(type: 'dependencies' | 'devDependencies') {
    return Object.fromEntries(
      Object.entries(this.packageJSON[type] ?? {})
        .filter(([, value]) => value === 'workspace:*')
        .map(([name]): [string, Package] => {
          const pkg = this.packageMapping.get(name);

          if (!pkg) {
            throw new Error(`Could not find workspace ${name}`);
          }

          return [name, pkg];
        }),
    );
  }

  get dependencies() {
    return this.packageJSON.dependencies ?? {};
  }

  get devDependencies() {
    return this.packageJSON.devDependencies ?? {};
  }

  async forEachFile(
    cb: (opts: {
      filePath: string;
      content: string;
      pkg: Package;
      fileHelper: FileHelper;
    }) => void | Promise<void>,
    filter: (fileHelper: FileHelper) => boolean | Promise<boolean> = () => true,
  ) {
    await this.modifyFiles(async (opts) => {
      await cb(opts);

      return opts.content;
    }, filter);
  }

  getAllFilePaths(): string[] {
    return this.packageState.files;
  }

  /**
   *
   * @returns true if pkg has one or more css files
   */
  getCssFileNames(): string[] {
    return this.getAllFilePaths()
      .map((filePath) => (filePath.endsWith('.css') ? filePath : undefined))
      .filter((r): r is string => Boolean(r));
  }

  getFileHelper(fileName: string) {
    return this.fileHelpers.get(fileName);
  }

  /**
   *
   * @returns true if pkg has one or more css files
   */
  hasCSSFiles(): boolean {
    return this.getCssFileNames().length > 0;
  }

  async modifyFiles(
    cb: (opts: {
      filePath: string;
      content: string;
      pkg: Package;
      fileHelper: FileHelper;
    }) => string | Promise<string>,
    filter: (fileHelper: FileHelper) => boolean | Promise<boolean> = () => true,
  ) {
    for (const [filePath, fileHelper] of this.fileHelpers.entries()) {
      if (!(await filter(fileHelper))) {
        continue;
      }

      const result = await fileHelper.modify((content) =>
        cb({ filePath, content, pkg: this, fileHelper }),
      );

      this.fileHelpers.set(filePath, result);
    }
  }

  /**
   * Returns a list of all the packages that this package imports
   * in the actual code. For example if it seems import x from 'y', it will return 'y'.
   * It does not look for package.json deps, devDeps etc
   * @param filter
   * @returns
   */
  async getImportedPackages(
    filter: (fileHelper: FileHelper) => Promise<boolean> | boolean = () => true,
  ) {
    const importedPackages = new Set<string>();

    await this.forEachFile(
      async ({ content }) => {
        for (const forwardedPath of [
          ...findAllImportedPackages(content),
          ...findAllExportedPaths(content),
        ]) {
          if (forwardedPath.startsWith('.')) {
            continue;
          }

          // ignore adding full path
          if (forwardedPath.startsWith('@')) {
            const [scope, pkg] = forwardedPath.split('/');
            importedPackages.add([scope, pkg].join('/'));
          } else {
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            importedPackages.add(forwardedPath.split('/')[0]!);
          }
        }
      },
      (file) => file.isTSFile && filter(file),
    );

    return [...importedPackages];
  }

  async modifyPackageJSON(
    cb: (pkgJSON: PackageJSON, pkg: Package) => PackageJSON,
  ): Promise<void> {
    const newJSON = cb(this.packageJSON, this);

    if (JSON.stringify(newJSON) === JSON.stringify(this.packageJSON)) {
      return;
    }

    await fsProm.writeFile(
      path.join(`${this.packagePath}/package.json`),
      `${JSON.stringify(newJSON, null, 2)}\n`,
      'utf-8',
    );

    this.packageState.packageJSON = newJSON;
    this._compute();
  }

  async removeDependency({
    name,
    type,
  }: {
    type: 'dependencies' | 'devDependencies';
    name: string;
  }) {
    return this.modifyPackageJSON((pkgJSON) => {
      const dep = JSON.parse(JSON.stringify(pkgJSON[type] ?? {}));
      delete dep[name];

      return {
        ...pkgJSON,
        [type]: dep,
      };
    });
  }

  async addDependency({
    name,
    version,
    type,
  }: {
    type: 'dependencies' | 'devDependencies';
    name: string;
    version: string;
  }) {
    return this.modifyPackageJSON((pkgJSON) => {
      return {
        ...pkgJSON,
        [type]: {
          ...pkgJSON[type],
          [name]: version,
        },
      };
    });
  }

  async toJSON() {
    return {
      name: this.name,
      packageJSON: this.packageJSON,
      packagePath: this.packagePath,
      workspaceDependencies: Object.keys(this.workspaceDependencies),
      workspaceDevDependencies: Object.keys(this.workspaceDevDependencies),
    };
  }
}

class FileHelper {
  contentCache: string | undefined;

  constructor(public filePath: string) {}

  get isCSSFile() {
    return this.filePath.endsWith('.css');
  }

  get isJSFile() {
    return this.filePath.endsWith('.js') || this.filePath.endsWith('.jsx');
  }

  get isJSONFile() {
    return this.filePath.endsWith('.json');
  }

  /**
   * The actual source code file that will be run in production (excludes test, storybook files, etc)
   */
  get isSrcFile() {
    return !this.isTestFile && !this.isStoryBookFile;
  }

  get isNonSrcFile() {
    return !this.isSrcFile;
  }

  get isTsSrcFile() {
    return this.isSrcFile && this.isTSFile;
  }

  /**
   * A TS File but not part of src
   */
  get isTsNonSrcFile() {
    return this.isTSFile && this.isNonSrcFile;
  }

  get isTestFile() {
    return this.filePath.includes('__tests__');
  }

  get isStoryBookFile() {
    return this.filePath.includes('.stories.');
  }

  get isTSFile() {
    return this.filePath.endsWith('.ts') || this.filePath.endsWith('.tsx');
  }

  get isUnitTestFile() {
    return this.filePath.includes('.test.');
  }

  async hasText(match: string | RegExp) {
    const content = await this.readCached();

    return match instanceof RegExp
      ? match.test(content)
      : content.includes(match);
  }

  async modify(cb: (content: string) => string | Promise<string>) {
    const content = await this.read();

    // skip files that have this comment
    if (content.includes('// @bangle-ignore-checks')) {
      return this;
    }

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

export function isAValidBanglePackage(name: string, packages: Package[]) {
  const result = packages.some((pkg) => pkg.name === name);
  return result;
}
